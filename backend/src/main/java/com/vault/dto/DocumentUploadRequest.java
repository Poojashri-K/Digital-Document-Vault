package com.vault.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DocumentUploadRequest(
        @NotBlank(message = "Document title is required")
        @Size(max = 255, message = "Document title cannot exceed 255 characters")
        String title,

        @Size(max = 2000, message = "Description cannot exceed 2000 characters")
        String description
) {}
