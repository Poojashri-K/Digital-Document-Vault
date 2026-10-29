-- Digital Document Vault - Database Schema Migration V1
-- Normalized schema for User, Document, DocumentVersion, DocumentPermission, ShareInvitation, DownloadEvent, AuditEvent

CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    failed_login_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

CREATE TABLE documents (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_documents_owner FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at);

CREATE TABLE document_versions (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    version_number INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    file_size_bytes BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_versions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_versions_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_document_version_number UNIQUE (document_id, version_number)
);

CREATE INDEX idx_versions_document ON document_versions(document_id);
CREATE INDEX idx_versions_storage_key ON document_versions(storage_key);

CREATE TABLE document_permissions (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    user_id UUID NOT NULL,
    permission_type VARCHAR(20) NOT NULL,
    granted_by UUID NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_permissions_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_permissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_permissions_granter FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_permissions_doc_user ON document_permissions(document_id, user_id);
CREATE INDEX idx_permissions_user ON document_permissions(user_id);
CREATE INDEX idx_permissions_active ON document_permissions(is_active);

CREATE TABLE share_invitations (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    invited_by UUID NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    permission_type VARCHAR(20) NOT NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_invitations_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitations_inviter FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_invitations_token ON share_invitations(token);
CREATE INDEX idx_invitations_recipient ON share_invitations(recipient_email);

CREATE TABLE download_events (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    version_id UUID NOT NULL,
    user_id UUID NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    downloaded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_downloads_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    CONSTRAINT fk_downloads_version FOREIGN KEY (version_id) REFERENCES document_versions(id) ON DELETE CASCADE,
    CONSTRAINT fk_downloads_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_downloads_document ON download_events(document_id);
CREATE INDEX idx_downloads_user ON download_events(user_id);
CREATE INDEX idx_downloads_time ON download_events(downloaded_at);

CREATE TABLE audit_events (
    id UUID PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    actor_id UUID,
    actor_username VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    action_details TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    correlation_id VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_audit_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_actor_id ON audit_events(actor_id);
CREATE INDEX idx_audit_resource ON audit_events(resource_type, resource_id);
CREATE INDEX idx_audit_created_at ON audit_events(created_at);
CREATE INDEX idx_audit_correlation_id ON audit_events(correlation_id);
