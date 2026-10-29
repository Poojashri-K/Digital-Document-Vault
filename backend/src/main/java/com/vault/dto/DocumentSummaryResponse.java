package com.vault.dto;

import com.vault.entity.DocumentStatus;
import com.vault.entity.PermissionType;

import java.time.Instant;
import java.util.UUID;

public record DocumentSummaryResponse(
        UUID id,
        String title,
        String description,
        DocumentStatus status,
        int currentVersionNumber,
        String currentFileName,
        long currentFileSizeBytes,
        String currentContentType,
        UUID ownerId,
        String ownerUsername,
        String ownerFullName,
        PermissionType sharedPermissionType, // populated when querying shared documents
        Instant sharedExpiresAt,
        Instant createdAt,
        Instant updatedAt
) {}
