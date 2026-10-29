package com.vault.dto;

import com.vault.entity.PermissionType;

import java.time.Instant;
import java.util.UUID;

public record DocumentPermissionResponse(
        UUID id,
        UUID userId,
        String username,
        String email,
        String fullName,
        PermissionType permissionType,
        UUID grantedById,
        String grantedByUsername,
        Instant expiresAt,
        Instant revokedAt,
        boolean active,
        boolean expired,
        Instant createdAt
) {}
