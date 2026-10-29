# Security Specification & Threat Model: Digital Document Vault

This document details the threat modeling, security architecture, vulnerability defenses, and negative security testing results for the Digital Document Vault.

---

## 1. Threat Model (STRIDE Methodology)

| Threat Category (STRIDE) | Attack Vector / Scenario | Countermeasure & Defensive Control | Verified Acceptance Criteria |
|---|---|---|---|
| **Spoofing Identity** | Attacker impersonates an authorized document owner or administrator via brute-force or credential stuffing. | - Password hashing with BCrypt (adaptive cost 12).<br/>- Minimum 12 character complexity requirement.<br/>- 5-attempt brute-force throttling and 15-minute account lockout.<br/>- Session ID regeneration upon login to eliminate session fixation. | Tested in `AuthControllerApiTest` |
| **Tampering with Data** | Attacker attempts to modify document payloads or inject backdoors into historical versions. | - Immutable `DocumentVersion` entities (read-only historical storage).<br/>- Cryptographic SHA-256 digest computation stored in PostgreSQL.<br/>- Server-controlled file storage outside web root. | Verified in `AC05_AuditLogCompletenessTest` |
| **Repudiation** | User denies uploading, downloading, or sharing sensitive corporate documents. | - Immutable security audit trail recording actor, IP, timestamp (UTC), correlation ID, and action metadata.<br/>- Dedicated `download_events` table tracking every downloaded file stream. | **AC-05** Verified |
| **Information Disclosure** | 1. User guesses UUID to download unshared files (IDOR/BOLA).<br/>2. Malicious user uses path traversal (`../`) to access host OS files.<br/>3. System Admin reads private customer documents. | - Zero-trust database authorization on every download request.<br/>- Storage filenames use generated UUIDs; traversal sequences (`../`, `..\`) are stripped.<br/>- System Administrators strictly denied business document access. | **AC-01 & AC-02** Verified |
| **Denial of Service** | Attacker uploads multi-gigabyte files or floods endpoint with concurrent requests. | - Strict 25 MB payload limit enforced at reverse proxy and Spring application level.<br/>- In-memory rate-limiting filter per client IP.<br/>- Non-blocking reactive streaming for file downloads. | Verified in `ConcurrencyPerformanceTest` |
| **Elevation of Privilege** | Shared user attempts to grant permissions to others or tamper with role attributes. | - Cascading shares strictly prohibited: only Document Owner can grant or revoke access.<br/>- Backend Spring Security `@PreAuthorize` role annotations on all admin endpoints. | **AC-03** Verified |

---

## 2. Defensive Controls & Security Architecture

### 2.1 File Upload & Magic-Byte Validation (AC-04)
Traditional file upload validation relies on client-supplied file extensions or `Content-Type` request headers, both of which can be trivially spoofed by attackers. The Digital Document Vault utilizes **Apache Tika 2.9.2** deep content inspection:
- When a file arrives, the raw byte stream is inspected to determine its true binary magic bytes (e.g. `%PDF-` for PDFs, `PK\x03\x04` for Office OpenXML zip packages).
- Executables (`.exe`, `.dll`, `.com`), ELF binaries, shell scripts (`.sh`, `.bat`, `.cmd`), Python scripts, and HTML files are unconditionally denied.
- Files with mismatched extensions and content (e.g., an executable named `report.pdf`) are immediately rejected with an HTTP 400 Bad Request error.

### 2.2 Path Traversal Prevention (AC-01)
- User-provided filenames are never concatenated directly into filesystem paths.
- Filenames are sanitized via `StringUtils.cleanPath()` and regular expressions removing control characters and path navigation sequences.
- On storage, the server generates a cryptographically random UUID (`UUID.randomUUID().toString()`) and writes the file to `/vault/storage/{uuid}.dat`.
- Before any file I/O, the path is normalized and verified against the canonical base directory:
  ```java
  Path normalizedTarget = targetPath.normalize().toAbsolutePath();
  if (!normalizedTarget.startsWith(baseDirectory.toAbsolutePath())) {
      throw new SecurityException("Path traversal attempt detected");
  }
  ```

### 2.3 Zero-Trust Authorization & IDOR Elimination (AC-02)
- All document access requests verify user authentication and active authorization policies in a single query.
- Knowing or guessing another user's document UUID results in an immediate HTTP 403 Forbidden denial and an `ACCESS_DENIED` security audit event.
- System administrators (`ROLE_SYSTEM_ADMIN`) are explicitly barred from viewing or downloading customer vault files, enforcing strict operational segregation of duties.

### 2.4 Immediate Revocation & Share Expiration (AC-03)
- When a document owner revokes a share, the backend sets `revoked_at = NOW()` and `active = false`.
- Any subsequent attempt by the recipient to download or view metadata fails immediately with HTTP 403 Forbidden.
- Expired shares (`expires_at < NOW()`) are automatically treated as invalid without requiring asynchronous cleanup jobs.
- Shared users are strictly prevented from re-sharing documents with other users.

### 2.5 Secure Download Streaming
- Documents are streamed with headers preventing browser MIME-sniffing:
  ```http
  Content-Disposition: attachment; filename="Report.pdf"
  X-Content-Type-Options: nosniff
  Cache-Control: no-cache, no-store, must-revalidate
  Pragma: no-cache
  Expires: 0
  ```
- Files are never rendered inline in the browser, eliminating stored XSS risks from uploaded SVG or HTML files.

### 2.6 Zero-Knowledge Security Audit Trail (AC-05)
- All security-relevant actions trigger structured audit logging:
  - `AUTH_LOGIN_SUCCESS`, `AUTH_LOGIN_FAILED`, `AUTH_LOGOUT`, `AUTH_REGISTER`
  - `DOCUMENT_UPLOAD`, `DOCUMENT_VERSION_UPLOAD`, `DOCUMENT_DOWNLOAD`, `DOCUMENT_DELETE`
  - `SHARE_GRANT`, `SHARE_REVOKE`
  - `ACCESS_DENIED`
  - `USER_STATUS_CHANGE`, `PROFILE_UPDATE`
- The audit service captures: timestamp (UTC), actor ID/username, event type, resource type/ID, client IP address, User-Agent, and correlation ID.
- **Strict Data Sanitization**: Passwords, authorization headers, session cookies, and binary document contents are strictly excluded from audit records.

---

## 3. Negative Security Testing Verification

The automated security test suite comprises 25 dedicated negative security test cases that prove the resilience of these controls:

| Test Class | Test Scenario | Expected Outcome | Result |
|---|---|---|---|
| `AC01_PathTraversalTest` | Upload filename with `../../etc/passwd` | Traversal stripped; stored safely | **PASSED** |
| `AC01_PathTraversalTest` | Upload filename with Windows traversal `..\..\boot.ini` | Traversal stripped; stored safely | **PASSED** |
| `AC01_PathTraversalTest` | Absolute unix path `/var/log/system.log` | Normalized inside vault root | **PASSED** |
| `AC01_PathTraversalTest` | Absolute windows path `C:\Windows\System32\cmd.exe` | Normalized inside vault root | **PASSED** |
| `AC01_PathTraversalTest` | Filename with null bytes `secret.pdf\0.exe` | Stripped and sanitized safely | **PASSED** |
| `AC02_IdorAuthorizationTest` | Unauthenticated access to document metadata | HTTP 401 Unauthorized | **PASSED** |
| `AC02_IdorAuthorizationTest` | Guessing UUID of unshared document by another user | HTTP 403 Forbidden | **PASSED** |
| `AC02_IdorAuthorizationTest` | Guessing UUID of unshared document for download | HTTP 403 Forbidden | **PASSED** |
| `AC02_IdorAuthorizationTest` | System Admin attempts to download customer document | HTTP 403 Forbidden | **PASSED** |
| `AC03_RevokedAndExpiredSharesTest` | Download after owner revokes permission | HTTP 403 Forbidden | **PASSED** |
| `AC03_RevokedAndExpiredSharesTest` | Download after share expiration timestamp has passed | HTTP 403 Forbidden | **PASSED** |
| `AC03_RevokedAndExpiredSharesTest` | Shared user attempts to grant access to a third party | HTTP 403 Forbidden | **PASSED** |
| `AC03_RevokedAndExpiredSharesTest` | Shared user with VIEW-only attempts to download | HTTP 403 Forbidden | **PASSED** |
| `AC04_ContentTypeValidationTest` | Windows PE executable disguised as `.pdf` | HTTP 400 Rejected | **PASSED** |
| `AC04_ContentTypeValidationTest` | Linux bash script disguised as `.txt` | HTTP 400 Rejected | **PASSED** |
| `AC04_ContentTypeValidationTest` | File with empty content | HTTP 400 Rejected | **PASSED** |
| `AC04_ContentTypeValidationTest` | Genuine PDF upload with matching magic bytes | HTTP 201 Accepted | **PASSED** |
| `AC04_ContentTypeValidationTest` | Genuine Word `.docx` with matching zip magic bytes | HTTP 201 Accepted | **PASSED** |
| `AC04_ContentTypeValidationTest` | Genuine PNG image with `\x89PNG` magic bytes | HTTP 201 Accepted | **PASSED** |
| `AC05_AuditLogCompletenessTest` | Verify full audit trail for upload, share, download, revoke | Audit records match without secret leaks | **PASSED** |
