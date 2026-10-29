package com.vault.dto;

import com.vault.entity.PermissionType;

import java.time.Instant;
import java.util.UUID;

public record ShareResponse(
        UUID id,
        UUID documentId,
        String documentTitle,
        UUID recipientId,
        String recipientUsername,
        String recipientEmail,
        String recipientFullName,
        PermissionType permissionType,
        UUID grantedById,
        String grantedByUsername,
        Instant expiresAt,
        Instant revokedAt,
        boolean active,
        Instant createdAt
) {}
