package com.vault.controller;

import com.vault.dto.*;
import com.vault.entity.DocumentStatus;
import com.vault.entity.User;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.DocumentService;
import com.vault.service.ShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@Tag(name = "Documents", description = "Core document management, upload, versioning, download, and sharing endpoints")
public class DocumentController {

    private final DocumentService documentService;
    private final ShareService shareService;
    private final UserRepository userRepository;

    public DocumentController(DocumentService documentService,
                              ShareService shareService,
                              UserRepository userRepository) {
        this.documentService = documentService;
        this.shareService = shareService;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(UserPrincipal principal) {
        return userRepository.findById(principal.getId()).orElseThrow();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a new document with validation of content type, size, and filename")
    public ResponseEntity<ApiResponse<DocumentSummaryResponse>> uploadDocument(
            @RequestParam("title") @NotBlank String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        DocumentSummaryResponse response = documentService.uploadDocument(title, description, file, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Document uploaded successfully", response));
    }

    @GetMapping
    @Operation(summary = "List and search owned documents with pagination and sorting allowlist")
    public ResponseEntity<ApiResponse<PagedResponse<DocumentSummaryResponse>>> listDocuments(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "status", required = false) DocumentStatus status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @RequestParam(value = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(value = "sortDirection", defaultValue = "DESC") String sortDirection,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        PagedResponse<DocumentSummaryResponse> response = documentService.listOwnedDocuments(
                currentUser, query, status, page, size, sortBy, sortDirection
        );
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}/metadata")
    @Operation(summary = "Get document metadata, versions, and permissions with authorization enforcement")
    public ResponseEntity<ApiResponse<DocumentDetailResponse>> getDocumentMetadata(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        DocumentDetailResponse response = documentService.getDocumentMetadata(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Securely download a document version with permission check and audit logging")
    public ResponseEntity<Resource> downloadDocument(
            @PathVariable("id") UUID id,
            @RequestParam(value = "version", required = false) Integer version,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        DocumentService.DownloadPayload payload = documentService.downloadDocument(id, version, currentUser);

        String encodedFilename = URLEncoder.encode(payload.version().getFileName(), StandardCharsets.UTF_8).replace("+", "%20");
        ContentDisposition contentDisposition = ContentDisposition.attachment()
                .filename(payload.version().getFileName(), StandardCharsets.UTF_8)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, contentDisposition.toString())
                .header("X-Content-Type-Options", "nosniff")
                .header("Cache-Control", "no-cache, no-store, must-revalidate")
                .header("Pragma", "no-cache")
                .header("Expires", "0")
                .contentType(MediaType.parseMediaType(payload.version().getContentType()))
                .contentLength(payload.version().getFileSizeBytes())
                .body(payload.resource());
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a new version for an owned document")
    public ResponseEntity<ApiResponse<DocumentVersionResponse>> uploadNewVersion(
            @PathVariable("id") UUID id,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        DocumentVersionResponse response = documentService.uploadNewVersion(id, file, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("New version uploaded successfully", response));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Archive or soft-delete an owned document")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        documentService.deleteDocument(id, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Document deleted successfully"));
    }

    @GetMapping("/shared-with-me")
    @Operation(summary = "List documents shared with the currently authenticated user")
    public ResponseEntity<ApiResponse<PagedResponse<DocumentSummaryResponse>>> listSharedWithMe(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = getAuthenticatedUser(principal);
        PagedResponse<DocumentSummaryResponse> response = shareService.listSharedWithMe(currentUser, query, page, size);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
