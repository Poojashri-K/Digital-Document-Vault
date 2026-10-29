package com.vault.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentVersionResponse(
        UUID id,
        int versionNumber,
        String fileName,
        long fileSizeBytes,
        String contentType,
        String checksumSha256,
        UUID uploadedById,
        String uploadedByUsername,
        Instant createdAt
) {}
