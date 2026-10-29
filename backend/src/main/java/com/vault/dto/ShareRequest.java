package com.vault.dto;

import com.vault.entity.PermissionType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record ShareRequest(
        @NotBlank(message = "Recipient email is required")
        @Email(message = "Recipient email must be valid")
        String recipientEmail,

        @NotNull(message = "Permission type (VIEW or DOWNLOAD) is required")
        PermissionType permissionType,

        Instant expiresAt
) {}
