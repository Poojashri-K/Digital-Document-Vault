package com.vault.service;

import com.vault.dto.*;
import com.vault.entity.*;
import com.vault.exception.AccessDeniedCustomException;
import com.vault.exception.DocumentNotFoundException;
import com.vault.exception.VaultException;
import com.vault.repository.DocumentPermissionRepository;
import com.vault.repository.DocumentRepository;
import com.vault.repository.DocumentVersionRepository;
import com.vault.repository.DownloadEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.*;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of("title", "createdAt", "updatedAt");

    private final DocumentRepository documentRepository;
    private final DocumentVersionRepository versionRepository;
    private final DocumentPermissionRepository permissionRepository;
    private final DownloadEventRepository downloadEventRepository;
    private final StorageService storageService;
    private final FileValidationService fileValidationService;
    private final AuditService auditService;

    public DocumentService(DocumentRepository documentRepository,
                           DocumentVersionRepository versionRepository,
                           DocumentPermissionRepository permissionRepository,
                           DownloadEventRepository downloadEventRepository,
                           StorageService storageService,
                           FileValidationService fileValidationService,
                           AuditService auditService) {
        this.documentRepository = documentRepository;
        this.versionRepository = versionRepository;
        this.permissionRepository = permissionRepository;
        this.downloadEventRepository = downloadEventRepository;
        this.storageService = storageService;
        this.fileValidationService = fileValidationService;
        this.auditService = auditService;
    }

    /**
     * Uploads a new document with version 1.
     */
    @Transactional
    public DocumentSummaryResponse uploadDocument(String title, String description, MultipartFile file, User currentUser) {
        if (currentUser.getRole() == Role.ROLE_SYSTEM_ADMIN) {
            throw new AccessDeniedCustomException("System administrators cannot manage business vault documents");
        }

        // AC-04: Validate file content type, size, extension
        String detectedContentType = fileValidationService.validateFile(file);

        // AC-01: Sanitize original filename
        String sanitizedFilename = fileValidationService.sanitizeFilename(file.getOriginalFilename());

        // Generate opaque storage key (never store by client filename)
        String storageKey = UUID.randomUUID().toString() + ".dat";

        // Store file safely outside web root and compute SHA-256
        String checksum = storageService.store(file, storageKey);

        Document document = new Document(UUID.randomUUID(), title.trim(), description != null ? description.trim() : null, currentUser);
        document = documentRepository.save(document);

        DocumentVersion version = new DocumentVersion(
                UUID.randomUUID(),
                document,
                1,
                sanitizedFilename,
                storageKey,
                file.getSize(),
                detectedContentType,
                checksum,
                currentUser
        );
        versionRepository.save(version);

        // AC-05: Record upload audit event without file content
        String details = String.format("{\"fileName\":\"%s\",\"sizeBytes\":%d,\"contentType\":\"%s\",\"version\":1}",
                sanitizedFilename, file.getSize(), detectedContentType);
        auditService.recordEvent(
                AuditEventType.DOCUMENT_UPLOAD,
                currentUser,
                "DOCUMENT",
                document.getId().toString(),
                details
        );

        return toSummary(document, null);
    }

    /**
     * Uploads a subsequent version of an existing document.
     */
    @Transactional
    public DocumentVersionResponse uploadNewVersion(UUID documentId, MultipartFile file, User currentUser) {
        Document document = documentRepository.findByIdAndStatusNot(documentId, DocumentStatus.DELETED)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with id: " + documentId));

        if (!document.getOwner().getId().equals(currentUser.getId())) {
            auditService.recordEvent(
                    AuditEventType.ACCESS_DENIED,
                    currentUser,
                    "DOCUMENT",
                    documentId.toString(),
                    "Unauthorized version upload attempt on document owned by " + document.getOwner().getUsername()
            );
            throw new AccessDeniedCustomException("Only the document owner can upload new versions");
        }

        String detectedContentType = fileValidationService.validateFile(file);
        String sanitizedFilename = fileValidationService.sanitizeFilename(file.getOriginalFilename());
        String storageKey = UUID.randomUUID().toString() + ".dat";
        String checksum = storageService.store(file, storageKey);

        int nextVersionNumber = versionRepository.findFirstByDocumentIdOrderByVersionNumberDesc(documentId)
                .map(v -> v.getVersionNumber() + 1)
                .orElse(1);

        DocumentVersion version = new DocumentVersion(
                UUID.randomUUID(),
                document,
                nextVersionNumber,
                sanitizedFilename,
                storageKey,
                file.getSize(),
                detectedContentType,
                checksum,
                currentUser
        );
        version = versionRepository.save(version);
        document.setUpdatedAt(Instant.now());
        documentRepository.save(document);

        String details = String.format("{\"fileName\":\"%s\",\"sizeBytes\":%d,\"contentType\":\"%s\",\"version\":%d}",
                sanitizedFilename, file.getSize(), detectedContentType, nextVersionNumber);
        auditService.recordEvent(
                AuditEventType.DOCUMENT_VERSION_UPLOAD,
                currentUser,
                "DOCUMENT",
                document.getId().toString(),
                details
        );

        return toVersionResponse(version);
    }

    /**
     * Lists documents owned by current user.
     */
    @Transactional(readOnly = true)
    public PagedResponse<DocumentSummaryResponse> listOwnedDocuments(
            User currentUser,
            String query,
            DocumentStatus status,
            int page,
            int size,
            String sortBy,
            String sortDirection
    ) {
        if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
            sortBy = "createdAt";
        }
        Sort.Direction direction = "ASC".equalsIgnoreCase(sortDirection) ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(direction, sortBy));

        Page<Document> docPage;
        String q = (query != null && !query.isBlank()) ? query.trim() : null;
        if (status != null && status != DocumentStatus.DELETED) {
            docPage = documentRepository.findByOwnerAndStatusAndSearch(currentUser.getId(), status, q, pageable);
        } else {
            docPage = documentRepository.findByOwnerAndNotDeletedAndSearch(currentUser.getId(), q, pageable);
        }

        return PagedResponse.from(docPage.map(d -> toSummary(d, null)));
    }

    /**
     * Retrieves document metadata and version history with AC-02 authorization check.
     */
    @Transactional(readOnly = true)
    public DocumentDetailResponse getDocumentMetadata(UUID documentId, User currentUser) {
        Document document = documentRepository.findByIdAndStatusNot(documentId, DocumentStatus.DELETED)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with id: " + documentId));

        boolean isOwner = document.getOwner().getId().equals(currentUser.getId());
        PermissionType userPermission = null;

        if (isOwner) {
            userPermission = PermissionType.DOWNLOAD;
        } else {
            // System administrator has no default access to document metadata
            if (currentUser.getRole() == Role.ROLE_SYSTEM_ADMIN) {
                auditService.recordEvent(
                        AuditEventType.ACCESS_DENIED,
                        currentUser,
                        "DOCUMENT",
                        documentId.toString(),
                        "System Admin attempted unauthorized access to business document metadata"
                );
                throw new AccessDeniedCustomException("System administrators do not have access to private documents");
            }

            // Check active share permission (AC-02, AC-03)
            Optional<DocumentPermission> permOpt = permissionRepository.findActivePermission(
                    documentId, currentUser.getId(), Instant.now()
            );

            if (permOpt.isEmpty()) {
                auditService.recordEvent(
                        AuditEventType.ACCESS_DENIED,
                        currentUser,
                        "DOCUMENT",
                        documentId.toString(),
                        "Access denied: No active permission for document"
                );
                throw new AccessDeniedCustomException("You do not have permission to view this document");
            }
            userPermission = permOpt.get().getPermissionType();
        }

        List<DocumentVersionResponse> versionResponses = versionRepository
                .findByDocumentIdOrderByVersionNumberDesc(documentId)
                .stream()
                .map(this::toVersionResponse)
                .toList();

        List<DocumentPermissionResponse> permissionResponses = Collections.emptyList();
        if (isOwner) {
            permissionResponses = permissionRepository.findByDocumentId(documentId).stream()
                    .map(this::toPermissionResponse)
                    .toList();
        }

        return new DocumentDetailResponse(
                document.getId(),
                document.getTitle(),
                document.getDescription(),
                document.getStatus(),
                document.getOwner().getId(),
                document.getOwner().getUsername(),
                document.getOwner().getFullName(),
                userPermission,
                isOwner,
                versionResponses,
                permissionResponses,
                document.getCreatedAt(),
                document.getUpdatedAt()
        );
    }

    public record DownloadPayload(Resource resource, DocumentVersion version) {}

    /**
     * Downloads document file verifying AC-02 (IDOR protection) and AC-03 (revoked/expired shares fail immediately).
     */
    @Transactional
    public DownloadPayload downloadDocument(UUID documentId, Integer versionNumber, User currentUser) {
        Document document = documentRepository.findByIdAndStatusNot(documentId, DocumentStatus.DELETED)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with id: " + documentId));

        boolean isOwner = document.getOwner().getId().equals(currentUser.getId());

        if (!isOwner) {
            // System Administrator denied by default
            if (currentUser.getRole() == Role.ROLE_SYSTEM_ADMIN) {
                auditService.recordEvent(
                        AuditEventType.ACCESS_DENIED,
                        currentUser,
                        "DOCUMENT",
                        documentId.toString(),
                        "System Administrator attempted unauthorized document download"
                );
                throw new AccessDeniedCustomException("System administrators are not permitted to download business documents");
            }

            // AC-02, AC-03: Verify active permission
            Optional<DocumentPermission> permOpt = permissionRepository.findActivePermission(
                    documentId, currentUser.getId(), Instant.now()
            );

            if (permOpt.isEmpty()) {
                // Check if expired or revoked for accurate denial logging
                Optional<DocumentPermission> anyPerm = permissionRepository.findFirstByDocumentIdAndUserIdOrderByCreatedAtDesc(
                        documentId, currentUser.getId()
                );
                String denialReason = "No active share permission found";
                if (anyPerm.isPresent()) {
                    DocumentPermission p = anyPerm.get();
                    if (p.isRevoked()) {
                        denialReason = "Share permission has been revoked";
                    } else if (p.isExpired()) {
                        denialReason = "Share permission has expired on " + p.getExpiresAt();
                    }
                }

                auditService.recordEvent(
                        AuditEventType.ACCESS_DENIED,
                        currentUser,
                        "DOCUMENT",
                        documentId.toString(),
                        "Download denied: " + denialReason
                );
                throw new AccessDeniedCustomException(denialReason);
            }

            DocumentPermission permission = permOpt.get();
            // VIEW permission cannot download file binary
            if (permission.getPermissionType() == PermissionType.VIEW) {
                auditService.recordEvent(
                        AuditEventType.ACCESS_DENIED,
                        currentUser,
                        "DOCUMENT",
                        documentId.toString(),
                        "Download denied: user has VIEW permission only"
                );
                throw new AccessDeniedCustomException("Document share permission allows VIEW only; download is prohibited");
            }
        }

        // Resolve requested or latest version
        DocumentVersion version;
        if (versionNumber != null) {
            version = versionRepository.findByDocumentIdAndVersionNumber(documentId, versionNumber)
                    .orElseThrow(() -> new DocumentNotFoundException(
                            "Version " + versionNumber + " not found for document " + documentId));
        } else {
            version = versionRepository.findFirstByDocumentIdOrderByVersionNumberDesc(documentId)
                    .orElseThrow(() -> new DocumentNotFoundException("No versions available for document " + documentId));
        }

        Resource resource = storageService.loadAsResource(version.getStorageKey());

        // Record DownloadEvent and AC-05 Audit Event
        String ip = "unknown";
        String ua = "unknown";
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                ip = req.getRemoteAddr();
                ua = req.getHeader("User-Agent");
            }
        } catch (Exception ignored) {}

        DownloadEvent downloadEvent = new DownloadEvent(
                UUID.randomUUID(),
                document,
                version,
                currentUser,
                ip,
                ua
        );
        downloadEventRepository.save(downloadEvent);

        auditService.recordEvent(
                AuditEventType.DOCUMENT_DOWNLOAD,
                currentUser,
                "DOCUMENT",
                document.getId().toString(),
                String.format("{\"version\":%d,\"fileName\":\"%s\"}", version.getVersionNumber(), version.getFileName())
        );

        return new DownloadPayload(resource, version);
    }

    /**
     * Soft-deletes / archives document.
     */
    @Transactional
    public void deleteDocument(UUID documentId, User currentUser) {
        Document document = documentRepository.findByIdAndStatusNot(documentId, DocumentStatus.DELETED)
                .orElseThrow(() -> new DocumentNotFoundException("Document not found with id: " + documentId));

        if (!document.getOwner().getId().equals(currentUser.getId())) {
            auditService.recordEvent(
                    AuditEventType.ACCESS_DENIED,
                    currentUser,
                    "DOCUMENT",
                    documentId.toString(),
                    "Unauthorized deletion attempt on document owned by " + document.getOwner().getUsername()
            );
            throw new AccessDeniedCustomException("Only the document owner can delete this document");
        }

        document.setStatus(DocumentStatus.DELETED);
        documentRepository.save(document);

        auditService.recordEvent(
                AuditEventType.DOCUMENT_DELETED,
                currentUser,
                "DOCUMENT",
                document.getId().toString(),
                "Deleted document: " + document.getTitle()
        );
    }

    private DocumentSummaryResponse toSummary(Document doc, DocumentPermission permission) {
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
                permission != null ? permission.getPermissionType() : null,
                permission != null ? permission.getExpiresAt() : null,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }

    private DocumentVersionResponse toVersionResponse(DocumentVersion v) {
        return new DocumentVersionResponse(
                v.getId(),
                v.getVersionNumber(),
                v.getFileName(),
                v.getFileSizeBytes(),
                v.getContentType(),
                v.getChecksumSha256(),
                v.getUploadedBy().getId(),
                v.getUploadedBy().getUsername(),
                v.getCreatedAt()
        );
    }

    private DocumentPermissionResponse toPermissionResponse(DocumentPermission p) {
        return new DocumentPermissionResponse(
                p.getId(),
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
                p.isExpired(),
                p.getCreatedAt()
        );
    }
}
