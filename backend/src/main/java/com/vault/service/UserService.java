package com.vault.service;

import com.vault.dto.*;
import com.vault.entity.AuditEventType;
import com.vault.entity.Role;
import com.vault.entity.User;
import com.vault.entity.UserStatus;
import com.vault.exception.ResourceNotFoundException;
import com.vault.exception.UserAlreadyExistsException;
import com.vault.exception.VaultException;
import com.vault.repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByUsernameIgnoreCase(request.username())) {
            throw new UserAlreadyExistsException("Username is already taken: " + request.username());
        }
        if (userRepository.existsByEmailIgnoreCase(request.email())) {
            throw new UserAlreadyExistsException("Email is already registered: " + request.email());
        }

        if (request.password() == null || request.password().length() < 12) {
            throw new VaultException("Password must be at least 12 characters");
        }

        String hash = passwordEncoder.encode(request.password());
        User user = new User(
                UUID.randomUUID(),
                request.username().trim().toLowerCase(),
                request.email().trim().toLowerCase(),
                hash,
                request.fullName().trim(),
                Role.ROLE_USER
        );

        user = userRepository.save(user);

        auditService.recordEvent(
                AuditEventType.AUTH_REGISTER,
                user,
                "USER",
                user.getId().toString(),
                "Registered new account: " + user.getUsername()
        );

        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public UserResponse getUserByUsername(String username) {
        User user = userRepository.findByUsernameIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with username: " + username));
        return toResponse(user);
    }

    @Transactional
    public UserResponse updateProfile(UUID userId, UserProfileUpdateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        user.setFullName(request.fullName().trim());

        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.currentPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                throw new VaultException("Current password does not match");
            }
            if (request.newPassword().length() < 12) {
                throw new VaultException("New password must be at least 12 characters");
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        }

        user = userRepository.save(user);
        return toResponse(user);
    }

    @Transactional
    public void recordLoginSuccess(String usernameOrEmail) {
        userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(usernameOrEmail, usernameOrEmail)
                .ifPresent(u -> {
                    u.setFailedLoginAttempts(0);
                    u.setLockedUntil(null);
                    userRepository.save(u);
                });
    }

    @Transactional
    public void recordLoginFailure(String usernameOrEmail) {
        userRepository.findByUsernameIgnoreCaseOrEmailIgnoreCase(usernameOrEmail, usernameOrEmail)
                .ifPresent(u -> {
                    int attempts = u.getFailedLoginAttempts() + 1;
                    u.setFailedLoginAttempts(attempts);
                    if (attempts >= 5) {
                        u.setStatus(UserStatus.LOCKED);
                        u.setLockedUntil(Instant.now().plus(15, ChronoUnit.MINUTES));
                    }
                    userRepository.save(u);
                });
    }

    @Transactional
    public UserResponse updateUserStatus(UUID targetUserId, UserStatusUpdateRequest request, User adminUser) {
        User user = userRepository.findById(targetUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + targetUserId));

        user.setStatus(request.status());
        if (request.status() == UserStatus.ACTIVE) {
            user.setFailedLoginAttempts(0);
            user.setLockedUntil(null);
        }
        user = userRepository.save(user);

        auditService.recordEvent(
                AuditEventType.USER_STATUS_CHANGE,
                adminUser,
                "USER",
                user.getId().toString(),
                "Updated status for user " + user.getUsername() + " to " + request.status()
        );

        return toResponse(user);
    }

    @Transactional(readOnly = true)
    public PagedResponse<UserResponse> listUsers(String query, int page, int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by("username").ascending());
        Page<User> users;
        if (query != null && !query.isBlank()) {
            users = userRepository.findByUsernameContainingIgnoreCaseOrEmailContainingIgnoreCase(query.trim(), query.trim(), pageable);
        } else {
            users = userRepository.findAll(pageable);
        }
        return PagedResponse.from(users.map(this::toResponse));
    }

    public UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt()
        );
    }
}
