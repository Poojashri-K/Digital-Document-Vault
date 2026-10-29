package com.vault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserProfileUpdateRequest(
        @NotBlank(message = "Full name is required")
        @Size(max = 150, message = "Full name cannot exceed 150 characters")
        String fullName,

        String currentPassword,

        @Size(min = 12, max = 128, message = "New password must be at least 12 characters if provided")
        String newPassword
) {}
