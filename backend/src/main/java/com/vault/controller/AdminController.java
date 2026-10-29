package com.vault.controller;

import com.vault.dto.ApiResponse;
import com.vault.dto.AuditEventResponse;
import com.vault.dto.PagedResponse;
import com.vault.dto.UserResponse;
import com.vault.dto.UserStatusUpdateRequest;
import com.vault.entity.AuditEventType;
import com.vault.entity.User;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.AuditService;
import com.vault.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@Tag(name = "Administration", description = "Audit log inspection and administrative user management")
public class AdminController {

    private final AuditService auditService;
    private final UserService userService;
    private final UserRepository userRepository;

    public AdminController(AuditService auditService, UserService userService, UserRepository userRepository) {
        this.auditService = auditService;
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('VAULT_ADMIN', 'SYSTEM_ADMIN')")
    @Operation(summary = "View audit logs with filtering by event type, actor, resource, and date range")
    public ResponseEntity<ApiResponse<PagedResponse<AuditEventResponse>>> getAuditLogs(
            @RequestParam(value = "eventType", required = false) AuditEventType eventType,
            @RequestParam(value = "actorUsername", required = false) String actorUsername,
            @RequestParam(value = "resourceType", required = false) String resourceType,
            @RequestParam(value = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant fromDate,
            @RequestParam(value = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant toDate,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        PagedResponse<AuditEventResponse> logs = auditService.getAuditLogs(
                eventType, actorUsername, resourceType, fromDate, toDate, page, size
        );
        return ResponseEntity.ok(ApiResponse.ok(logs));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "List and search all registered users (System Admin only)")
    public ResponseEntity<ApiResponse<PagedResponse<UserResponse>>> listUsers(
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size
    ) {
        PagedResponse<UserResponse> users = userService.listUsers(query, page, size);
        return ResponseEntity.ok(ApiResponse.ok(users));
    }

    @PatchMapping("/users/{id}/status")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    @Operation(summary = "Update user account status (ACTIVE, LOCKED, DISABLED)")
    public ResponseEntity<ApiResponse<UserResponse>> updateUserStatus(
            @PathVariable("id") UUID id,
            @Valid @RequestBody UserStatusUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User admin = userRepository.findById(principal.getId()).orElseThrow();
        UserResponse response = userService.updateUserStatus(id, request, admin);
        return ResponseEntity.ok(ApiResponse.ok("User status updated successfully", response));
    }
}
