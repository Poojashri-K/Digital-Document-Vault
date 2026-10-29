# Architecture Documentation: Digital Document Vault

This document details the high-level architecture, container interactions, data flow, trust boundaries, and Architectural Decision Records (ADRs) for the Digital Document Vault.

---

## 1. System Overview & C4 Context

The Digital Document Vault provides secure, tamper-evident document storage, granular sharing, and centralized auditing.

```mermaid
C4Context
    title System Context Diagram - Digital Document Vault

    Person(user, "Vault User / Document Owner", "Uploads, manages, versions, and shares confidential documents.")
    Person(colleague, "Shared Colleague", "Accesses documents granted with VIEW or DOWNLOAD permissions.")
    Person(vaultAdmin, "Vault Administrator", "Reviews compliance audit logs and monitors security activity.")
    Person(sysAdmin, "System Administrator", "Manages user account status and platform lifecycle.")

    System(vaultSystem, "Digital Document Vault", "Secure document management platform with zero-trust RBAC and content verification.")

    Rel(user, vaultSystem, "Uploads and shares documents via HTTPS")
    Rel(colleague, vaultSystem, "Views and downloads shared documents via HTTPS")
    Rel(vaultAdmin, vaultSystem, "Inspects immutable audit logs via HTTPS")
    Rel(sysAdmin, vaultSystem, "Administers user accounts via HTTPS")
```

---

## 2. Container Architecture

```mermaid
graph TD
    subgraph Client Tier
        Browser["React 18 Single Page Application<br/>(TypeScript, Tailwind CSS)"]
    end

    subgraph Demilitarized Zone (DMZ)
        Nginx["Nginx 1.25 Reverse Proxy<br/>- TLS Termination<br/>- Static Content Cache<br/>- CSP & Security Headers"]
    end

    subgraph Application Tier
        SpringBoot["Spring Boot 3.3.4 Application Server<br/>- Spring Security (Session Auth, CSRF, Rate Limiting)<br/>- Document Service & Tika Magic Bytes Engine<br/>- Share & Revocation Policy Evaluator<br/>- Audit Logging Service"]
    end

    subgraph Data Tier
        Postgres[("PostgreSQL 16 Database<br/>- Users, Documents, Versions<br/>- Permissions, Audit Trails<br/>- Flyway Migrations")]
        DiskStorage[("Isolated Storage Volume<br/>/vault/storage<br/>- Opaque UUID Filenames<br/>- Strictly Outside Web Root")]
    end

    Browser -->|HTTP/2 HTTPS| Nginx
    Nginx -->|Proxy /api/*| SpringBoot
    Nginx -->|Static Assets| Browser
    SpringBoot -->|JDBC / Connection Pool| Postgres
    SpringBoot -->|Local I/O Stream| DiskStorage
```

---

## 3. Entity-Relationship Model (ER Diagram)

```mermaid
erDiagram
    USERS ||--o{ DOCUMENTS : owns
    USERS ||--o{ DOCUMENT_PERMISSIONS : "granted to"
    USERS ||--o{ AUDIT_EVENTS : triggers
    DOCUMENTS ||--|{ DOCUMENT_VERSIONS : contains
    DOCUMENTS ||--o{ DOCUMENT_PERMISSIONS : has
    DOCUMENTS ||--o{ DOWNLOAD_EVENTS : tracks

    USERS {
        uuid id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        varchar full_name
        varchar role
        varchar status
        int failed_login_attempts
        timestamp locked_until
        timestamp created_at
        timestamp updated_at
    }

    DOCUMENTS {
        uuid id PK
        varchar title
        varchar description
        uuid owner_id FK
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    DOCUMENT_VERSIONS {
        uuid id PK
        uuid document_id FK
        int version_number
        varchar file_name
        varchar storage_key UK
        bigint file_size_bytes
        varchar content_type
        varchar checksum_sha256
        uuid uploaded_by_id FK
        timestamp created_at
    }

    DOCUMENT_PERMISSIONS {
        uuid id PK
        uuid document_id FK
        uuid user_id FK
        varchar permission_type
        uuid granted_by_id FK
        timestamp expires_at
        timestamp revoked_at
        boolean active
        timestamp created_at
    }

    DOWNLOAD_EVENTS {
        uuid id PK
        uuid document_id FK
        uuid document_version_id FK
        uuid user_id FK
        varchar ip_address
        varchar user_agent
        varchar correlation_id
        timestamp downloaded_at
    }

    AUDIT_EVENTS {
        uuid id PK
        varchar event_type
        uuid actor_id FK
        varchar actor_username
        varchar resource_type
        varchar resource_id
        varchar action_details
        varchar ip_address
        varchar user_agent
        varchar correlation_id
        timestamp created_at
    }
```

---

## 4. Key Workflows & Sequence Diagrams

### 4.1 Document Upload Workflow (AC-01 & AC-04)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Document Owner
    participant Web as React Web App
    participant Controller as DocumentController
    participant Val as FileValidationService (Tika)
    participant Storage as LocalStorageService
    participant DB as Postgres Database
    participant Audit as AuditService

    Owner->>Web: Selects file & enters title
    Web->>Controller: POST /api/documents (multipart)
    Controller->>Val: validateFile(file)
    Val->>Val: Verify size <= 25 MB
    Val->>Val: Inspect binary magic bytes with Apache Tika
    Val->>Val: Match detected MIME with extension allowlist
    Controller->>Storage: storeFile(file, generatedUuid)
    Storage->>Storage: Sanitize filename & assert path containment
    Storage->>Storage: Write bytes to /vault/storage/{uuid}.dat
    Controller->>DB: INSERT into documents & document_versions (with SHA-256)
    Controller->>Audit: recordEvent(DOCUMENT_UPLOAD, actor, docId)
    Controller-->>Web: 201 Created (Document Metadata)
    Web-->>Owner: Display Document Details
```

### 4.2 Secure Download Workflow (AC-02 & AC-03)

```mermaid
sequenceDiagram
    autonumber
    actor User as Client / Shared Colleague
    participant Controller as DocumentController
    participant Service as DocumentService
    participant DB as Postgres Database
    participant Storage as LocalStorageService
    participant Audit as AuditService

    User->>Controller: GET /api/documents/{id}/download
    Controller->>Service: downloadDocument(id, version, user)
    Service->>DB: Query Document & Permissions for User
    alt User is Owner
        Service->>Service: Authorize download
    else User has active share permission
        Service->>Service: Check if revoked_at IS NULL and expires_at > NOW
        alt Revoked or Expired
            Service->>Audit: recordEvent(ACCESS_DENIED, user, docId, "Expired or revoked")
            Service-->>User: 403 Forbidden ("Share has been revoked or expired")
        else Valid Share & DOWNLOAD permission
            Service->>Service: Authorize download
        else Valid Share & VIEW permission
            Service->>Audit: recordEvent(ACCESS_DENIED, user, docId, "View-only permission")
            Service-->>User: 403 Forbidden ("View-only permission")
        end
    else No share record or IDOR guess
        Service->>Audit: recordEvent(ACCESS_DENIED, user, docId, "Unauthorized IDOR attempt")
        Service-->>User: 403 Forbidden ("Access denied")
    end

    Service->>Storage: loadResource(storageKey)
    Service->>Audit: recordEvent(DOCUMENT_DOWNLOAD, user, docId)
    Controller-->>User: 200 OK (Content-Disposition: attachment, nosniff)
```

---

## 5. Architectural Decision Records (ADRs)

### ADR-01: Opaque UUID File Storage Outside Web Root
- **Status**: Accepted
- **Context**: Storing files with user-provided names inside web-accessible directories leads to Path Traversal (CWE-22) and Remote Code Execution (CWE-434).
- **Decision**: All uploaded files are assigned a cryptographically random UUID (`UUID.randomUUID().toString()`) and stored as `{uuid}.dat` inside a dedicated storage root (`/vault/storage`), strictly outside the web root. User-supplied filenames are stored purely as metadata in the database and sanitized on egress.
- **Consequence**: Path traversal attempts (e.g. `../../../etc/passwd`) are rendered structurally impossible on the filesystem.

### ADR-02: Apache Tika Deep Content Inspection for Magic Bytes
- **Status**: Accepted
- **Context**: Attackers can disguise malicious executable binaries or shell scripts by renaming extensions (e.g., `malware.exe` to `invoice.pdf`).
- **Decision**: All uploaded files are inspected at the binary level using Apache Tika 2.9.2 to detect the true media type from header magic bytes. Mismatched content types or unallowed types (such as `application/x-dosexec`, `application/x-sh`) are immediately rejected with an HTTP 400 error.
- **Consequence**: Guaranteed defense against file spoofing and malicious script uploads.

### ADR-03: Stateful Cookie Sessions with Account Lockout Throttling
- **Status**: Accepted
- **Context**: Single-page applications often unsafely store JWTs in `localStorage` where they are vulnerable to XSS token theft.
- **Decision**: Use stateful Spring Security browser sessions with `HttpOnly`, `SameSite=Lax`, and `Secure` (in production) cookies. Session IDs rotate upon login to prevent session fixation. Failed logins trigger exponential throttling and automatic 15-minute account lockout after 5 consecutive failures.
- **Consequence**: Enhanced resistance against credential stuffing, brute force, and XSS-based token exfiltration.

### ADR-04: Least-Privilege Separation of System Administrator
- **Status**: Accepted
- **Context**: System administrators frequently possess over-privileged access allowing them to read customer private records.
- **Decision**: Strict RBAC enforces that `ROLE_SYSTEM_ADMIN` is authorized only for system maintenance and user account status updates (`/api/admin/users`). Requests by system administrators to query or download customer vault documents (`/api/documents/**`) are unconditionally denied by authorization checks.
- **Consequence**: Conforms to the Principle of Least Privilege and organizational data privacy compliance.

### ADR-05: Immutable Version History with SHA-256 Hashes
- **Status**: Accepted
- **Context**: Regulatory compliance and tamper prevention require that document revisions never overwrite past records.
- **Decision**: Uploading a new version creates a separate `DocumentVersion` entity with an incremental version number, separate storage key, and calculated SHA-256 digest. Historical versions cannot be overwritten or altered.
- **Consequence**: Provides non-repudiation and an immutable cryptographic audit record.
