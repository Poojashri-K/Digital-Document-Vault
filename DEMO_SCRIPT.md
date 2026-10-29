# Digital Document Vault: 5-to-10 Minute Demonstration Script

This walkthrough guides evaluators, security auditors, and product managers through demonstrating the full capabilities of the Digital Document Vault in under 10 minutes.

---

## Preparation & Quick Start

1. Ensure the services are running:
   ```bash
   # Via Docker Compose (Recommended)
   docker compose up --build -d

   # Or via local dev:
   # Backend: cd backend && .\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
   # Frontend: cd frontend && npm run dev
   ```
2. Open your web browser to **[http://localhost](http://localhost)** (or `http://localhost:3000`).
3. You will be greeted by the login screen featuring a **1-Click Demo Account Switcher** at the top right of the login card.

---

## Step 1: Document Owner - Upload & Magic-Byte Validation (AC-04 & AC-01)

1. On the login page, click **"Document Owner"** on the demo switcher (fills `owner@vault.local` / `OwnerPassword123!`) and click **Sign In**.
2. Notice the clean Dashboard displaying metrics: Total Documents, Shared with Me, and Security Shield status.
3. Click **"Upload Document"** in the sidebar.
4. **Demonstrate Negative Security (AC-04)**:
   - Try uploading a script or executable renamed to `.pdf` (e.g., a file containing `MZ...` or a shell script).
   - Observe that the upload is **immediately rejected** with: *"Content type mismatch: Detected executable/shell content does not match allowed document types"*.
5. **Upload a Genuine Document**:
   - Drag and drop a valid PDF or Word `.docx` file into the Dropzone.
   - Enter title: `Q4 Strategic Security Assessment`.
   - Click **"Upload to Vault"**.
6. The browser navigates to the Document Details page:
   - Note the **Cryptographic Integrity** card showing the SHA-256 digest.
   - Note that the physical file is stored safely under `/vault/storage/{uuid}.dat` outside the web root.

---

## Step 2: Version History & Non-Destructive Revisions

1. On the Document Details page, click **"New Version"**.
2. Drag and drop an updated revision file and click **"Upload New Version"**.
3. View the **Version History Timeline**:
   - Both `v1` and `v2` are listed with distinct SHA-256 digests, timestamps, and file sizes.
   - Click the **"Copy"** icon next to the SHA-256 digest to copy the hash to your clipboard.
   - Both versions remain individually downloadable, proving that historical versions cannot be overwritten.

---

## Step 3: Granular Zero-Trust Sharing (AC-03)

1. On the same Document Details page, click the **"Share"** button.
2. In the modal:
   - Recipient: Enter `colleague@vault.local`.
   - Permission: Select **"DOWNLOAD"**.
   - (Optional) Set an expiration timestamp.
   - Click **"Grant Share Permission"**.
3. Notice that `colleague@vault.local` immediately appears in the **Active Access Grants** list.
4. Click **"Logout"** in the top navigation bar.

---

## Step 4: Colleague Experience & Zero-Trust Enforcement (AC-02)

1. On the login screen, click **"Colleague"** on the demo switcher and sign in (`colleague@vault.local`).
2. Navigate to **"Shared with Me"** in the sidebar:
   - The shared document `Q4 Strategic Security Assessment` is visible with a **DOWNLOAD** badge and granter information (`owner@vault.local`).
3. Click the **"Download"** icon:
   - The file streams immediately with `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
4. **Demonstrate IDOR Prevention (AC-02)**:
   - If the colleague attempts to guess another document's UUID or access an unshared document directly via URL, they are immediately redirected or shown **HTTP 403 Forbidden**.

---

## Step 5: Immediate Revocation Enforcement (AC-03)

1. Sign out and log back in as **"Document Owner"**.
2. Open `Q4 Strategic Security Assessment`.
3. Under **Active Access Grants**, click the red **Revoke** icon next to `colleague@vault.local`.
4. Confirm revocation in the dialog:
   - The grant is marked as **Revoked** with an immediate timestamp.
5. Sign out and log back in as **"Colleague"**.
6. Navigate to **"Shared with Me"**:
   - The document is no longer available.
   - Any attempt to access `/api/documents/{id}/download` is **immediately rejected with HTTP 403 Forbidden: Share permission has been revoked**.

---

## Step 6: Vault Administrator - Immutable Audit Trail (AC-05)

1. Sign out and click **"Vault Admin"** on the demo switcher (`vaultadmin@vault.local`).
2. Navigate to **"Audit Logs"** in the sidebar.
3. Review the system-wide security audit trail:
   - Find records for `AUTH_LOGIN_SUCCESS`, `DOCUMENT_UPLOAD`, `DOCUMENT_VERSION_UPLOAD`, `SHARE_GRANT`, `DOCUMENT_DOWNLOAD`, `SHARE_REVOKE`, and `ACCESS_DENIED`.
   - Click the **Correlation ID** copy button to show how every request is traceable.
   - Note that **zero secrets**, passwords, or document bytes are stored in the logs.
4. Test the filtering toolbar: filter by `Event Type: ACCESS_DENIED` to view blocked unauthorized attempts.

---

## Step 7: System Administrator - Least Privilege Verification

1. Sign out and click **"System Admin"** on the demo switcher (`sysadmin@vault.local`).
2. Notice the restricted workspace:
   - **Least Privilege Principle**: System administrators have no access to business vault documents (`My Documents`, `Upload`, and `Shared with Me` are not in their navigation).
   - Any backend request to `/api/documents/**` is strictly blocked with HTTP 403.
3. Navigate to **"User Management"**:
   - Search for users, inspect account statuses (`ACTIVE`, `LOCKED`, `DISABLED`).
   - Click **"Status"** on a test account to demonstrate administrative account lockouts or reinstatements.

---

## Summary of Verified Acceptance Criteria in Demo

- **AC-01 (Path Traversal)**: Verified during upload filename sanitization.
- **AC-02 (IDOR / BOLA)**: Verified when non-owner/non-grantee accesses document UUIDs.
- **AC-03 (Immediate Revocation)**: Verified when owner revokes share and colleague is instantly blocked.
- **AC-04 (Magic Bytes)**: Verified when disguised executable upload is rejected.
- **AC-05 (Zero-Knowledge Audit Trail)**: Verified in the Vault Administrator audit dashboard.
