package com.vault.controller;

import com.vault.dto.ApiResponse;
import com.vault.dto.ShareRequest;
import com.vault.dto.ShareResponse;
import com.vault.entity.User;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.ShareService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/documents/{id}/shares")
@Tag(name = "Document Sharing", description = "Endpoints for sharing documents and revoking share permissions")
public class ShareController {

    private final ShareService shareService;
    private final UserRepository userRepository;

    public ShareController(ShareService shareService, UserRepository userRepository) {
        this.shareService = shareService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @Operation(summary = "Grant VIEW or DOWNLOAD permission to a registered user with optional expiration")
    public ResponseEntity<ApiResponse<ShareResponse>> shareDocument(
            @PathVariable("id") UUID documentId,
            @Valid @RequestBody ShareRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = userRepository.findById(principal.getId()).orElseThrow();
        ShareResponse response = shareService.shareDocument(documentId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Document shared successfully", response));
    }

    @DeleteMapping("/{shareId}")
    @Operation(summary = "Revoke a share permission; subsequent access is immediately denied")
    public ResponseEntity<ApiResponse<Void>> revokeShare(
            @PathVariable("id") UUID documentId,
            @PathVariable("shareId") UUID shareId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User currentUser = userRepository.findById(principal.getId()).orElseThrow();
        shareService.revokeShare(documentId, shareId, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Share permission revoked successfully"));
    }
}
