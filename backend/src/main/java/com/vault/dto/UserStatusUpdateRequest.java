package com.vault.dto;

import com.vault.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public record UserStatusUpdateRequest(
        @NotNull(message = "Status cannot be null")
        UserStatus status
) {}
