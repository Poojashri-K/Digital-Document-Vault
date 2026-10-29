package com.vault.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String correlationId,
        String path,
        Map<String, String> validationErrors
) {
    public ErrorResponse(int status, String error, String message, String correlationId, String path) {
        this(Instant.now(), status, error, message, correlationId, path, null);
    }

    public ErrorResponse(int status, String error, String message, String correlationId, String path, Map<String, String> validationErrors) {
        this(Instant.now(), status, error, message, correlationId, path, validationErrors);
    }
}
