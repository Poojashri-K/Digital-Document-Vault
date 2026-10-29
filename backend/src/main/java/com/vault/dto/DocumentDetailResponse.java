package com.vault.dto;

import com.vault.entity.DocumentStatus;
import com.vault.entity.PermissionType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DocumentDetailResponse(
        UUID id,
        String title,
        String description,
        DocumentStatus status,
        UUID ownerId,
        String ownerUsername,
        String ownerFullName,
        PermissionType userPermission, // OWNER, VIEW, DOWNLOAD
        boolean isOwner,
        List<DocumentVersionResponse> versions,
        List<DocumentPermissionResponse> permissions,
        Instant createdAt,
        Instant updatedAt
) {}
