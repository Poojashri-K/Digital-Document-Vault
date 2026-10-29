package com.vault.dto;

import com.vault.entity.Role;
import com.vault.entity.UserStatus;

import java.time.Instant;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        Role role,
        UserStatus status,
        Instant createdAt
) {}
