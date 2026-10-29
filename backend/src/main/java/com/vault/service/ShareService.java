package com.vault.service;

import com.vault.dto.DocumentSummaryResponse;
import com.vault.dto.PagedResponse;
import com.vault.dto.ShareRequest;
import com.vault.dto.ShareResponse;
import com.vault.entity.*;
import com.vault.exception.AccessDeniedCustomException;
import com.vault.exception.DocumentNotFoundException;
import com.vault.exception.InvalidShareException;
import com.vault.exception.ResourceNotFoundException;
import com.vault.repository.DocumentPermissionRepository;
import com.vault.repository.DocumentRepository;
import com.vault.repository.DocumentVersionRepository;
import com.vault.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class ShareService {

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ShareService(DocumentRepository documentRepository,
                        DocumentVersionRepository versionRepository,
                        DocumentPermissionRepository permissionRepository,
                        UserRepository userRepository,
                        AuditService auditService) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    /**
     * Shares a document with a registered user.
     * Enforces FR-03: Only the document owner can grant shares. Recipients cannot re-share.
     */
    @Transactional
    public ShareResponse shareDocument(UUID documentId, ShareRequest request, User currentUser) {
        Document document = documentRepository.findByIdAndStatusNot(documentId, DocumentStatus.DELETED)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with id: " + documentId));

        if (!document.getOwner().getId().equals(currentUser.getId())) {
            auditService.recordEvent(
                    AuditEventType.ACCESS_DENIED,
                    currentUser,
                    "DOCUMENT",
                    documentId.toString(),
                    "Unauthorized share grant attempt by non-owner " + currentUser.getUsername()
            );
            throw new AccessDeniedCustomException("Only the document owner can grant share permissions");
        }

        User recipient = userRepository.findByEmailIgnoreCase(request.recipientEmail().trim())
                .orElseThrow(() -> new ResourceNotFoundException("No registered user found with email: " + request.recipientEmail()));

        if (recipient.getId().equals(currentUser.getId())) {
            throw new InvalidShareException("You cannot share a document with yourself");
        }

        if (recipient.getRole() == Role.ROLE_SYSTEM_ADMIN) {
            throw new InvalidShareException("Documents cannot be shared with System Administrators");
        }

        if (request.expiresAt() != null && request.expiresAt().isBefore(Instant.now())) {
            throw new InvalidShareException("Share expiry time must be in the future");
        }

        // Upsert permission if existing
        Optional<DocumentPermission> existingOpt = permissionRepository.findByDocumentIdAndUserIdAndActiveTrue(
                documentId, recipient.getId()
        );

        DocumentPermission permission;
        if (existingOpt.isPresent()) {
            permission = existingOpt.get();
            permission.setPermissionType(request.permissionType());
            permission.setExpiresAt(request.expiresAt());
            permission.setRevokedAt(null);
            permission.setActive(true);
            permission.setGrantedBy(currentUser);
        } else {
            permission = new DocumentPermission(
                    UUID.randomUUID(),
                    document,
                    recipient,
                    request.permissionType(),
                    currentUser,
                    request.expiresAt()
            );
        }

        permission = permissionRepository.save(permission);

        // AC-05: Log share event without secret content
        String details = String.format("{\"recipientEmail\":\"%s\",\"permissionType\":\"%s\",\"expiresAt\":\"%s\"}",
                recipient.getEmail(), request.permissionType(), request.expiresAt() != null ? request.expiresAt().toString() : "null");
        auditService.recordEvent(
                AuditEventType.DOCUMENT_SHARE_GRANTED,
                currentUser,
                "DOCUMENT",
                document.getId().toString(),
                details
        );

        return toShareResponse(permission);
    }

    /**
     * Revokes a document share.
     * Enforces FR-04 & AC-03: Owner removes permission; subsequent access attempts fail immediately.
     */
    @Transactional
    public void revokeShare(UUID documentId, UUID shareId, User currentUser) {
        Document document = documentRepository.findByIdAndStatusNot(documentId, DocumentStatus.DELETED)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with id: " + documentId));

        if (!document.getOwner().getId().equals(currentUser.getId())) {
            auditService.recordEvent(
                    AuditEventType.ACCESS_DENIED,
                    currentUser,
                    "DOCUMENT",
                    documentId.toString(),
                    "Unauthorized share revocation attempt by non-owner " + currentUser.getUsername()
            );
            throw new AccessDeniedCustomException("Only the document owner can revoke share permissions");
        }

        DocumentPermission permission = permissionRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Share permission not found with id: " + shareId));

        if (!permission.getDocument().getId().equals(documentId)) {
            throw new InvalidShareException("Share permission does not belong to the specified document");
        }

        permission.setActive(false);
        permission.setRevokedAt(Instant.now());
        permissionRepository.save(permission);

        // AC-05: Audit revocation
        auditService.recordEvent(
                AuditEventType.DOCUMENT_SHARE_REVOKED,
                currentUser,
                "DOCUMENT",
                document.getId().toString(),
                "Revoked share for user: " + permission.getUser().getEmail()
        );
    }

    /**
     * Lists active documents shared with the current user.
     */
    @Transactional(readOnly = true)
    public PagedResponse<DocumentSummaryResponse> listSharedWithMe(User currentUser, String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        String q = (query != null && !query.isBlank()) ? query.trim() : null;

        Page<DocumentPermission> permissionsPage = permissionRepository.findActiveSharedWithUser(
                currentUser.getId(), Instant.now(), q, pageable
        );

        Page<DocumentSummaryResponse> dtoPage = permissionsPage.map(p -> {
            Document doc = p.getDocument();
            DocumentVersion latest = versionRepository.findFirstByDocumentIdOrderByVersionNumberDesc(doc.getId()).orElse(null);
            return new DocumentSummaryResponse(
                    doc.getId(),
                    doc.getTitle(),
                    doc.getDescription(),
                    doc.getStatus(),
                    latest != null ? latest.getVersionNumber() : 1,
                    latest != null ? latest.getFileName() : "unknown",
                    latest != null ? latest.getFileSizeBytes() : 0L,
                    latest != null ? latest.getContentType() : "application/octet-stream",
                    doc.getOwner().getId(),
                    doc.getOwner().getUsername(),
                    doc.getOwner().getFullName(),
                    p.getPermissionType(),
                    p.getExpiresAt(),
                    doc.getCreatedAt(),
                    doc.getUpdatedAt()
            );
        });

        return PagedResponse.from(dtoPage);
    }

    private ShareResponse toShareResponse(DocumentPermission p) {
        return new ShareResponse(
                p.getId(),
                p.getDocument().getId(),
                p.getDocument().getTitle(),
                p.getUser().getId(),
                p.getUser().getUsername(),
                p.getUser().getEmail(),
                p.getUser().getFullName(),
                p.getPermissionType(),
                p.getGrantedBy().getId(),
                p.getGrantedBy().getUsername(),
                p.getExpiresAt(),
                p.getRevokedAt(),
                p.isActive(),
                p.getCreatedAt()
        );
    }
}
