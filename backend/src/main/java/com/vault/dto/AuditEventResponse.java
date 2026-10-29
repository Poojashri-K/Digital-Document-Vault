package com.vault.dto;

import com.vault.entity.AuditEventType;

import java.time.Instant;
import java.util.UUID;

public record AuditEventResponse(
        UUID id,
        AuditEventType eventType,
        UUID actorId,
        String actorUsername,
        String resourceType,
        String resourceId,
        String actionDetails,
        String ipAddress,
        String userAgent,
        String correlationId,
        Instant createdAt
) {}
