package com.vault.controller;

import com.vault.dto.ApiResponse;
import com.vault.dto.LoginRequest;
import com.vault.dto.RegisterRequest;
import com.vault.dto.UserResponse;
import com.vault.entity.AuditEventType;
import com.vault.entity.User;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.AuditService;
import com.vault.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user registration, session login, logout, and current user profile")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public AuthController(AuthenticationManager authenticationManager,
                          UserService userService,
                          UserRepository userRepository,
                          AuditService auditService) {
        this.authenticationManager = authenticationManager;
        this.userService = userService;
        this.userRepository = userRepository;
        this.auditService = auditService;
    }

    @PostMapping("/register")
    @Operation(summary = "Register a new local user account")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = userService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Registration successful", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and establish a secure HTTP session")
    public ResponseEntity<ApiResponse<UserResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse
    ) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.usernameOrEmail().trim(), request.password())
            );

            // Establish secure session with session ID rotation
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);

            HttpSession session = httpRequest.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, context);

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            User user = userRepository.findById(principal.getId()).orElseThrow();

            userService.recordLoginSuccess(user.getUsername());
            auditService.recordEvent(
                    AuditEventType.AUTH_LOGIN_SUCCESS,
                    user,
                    "SESSION",
                    session.getId(),
                    "User logged in successfully"
            );

            return ResponseEntity.ok(ApiResponse.ok("Login successful", userService.toResponse(user)));
        } catch (BadCredentialsException ex) {
            userService.recordLoginFailure(request.usernameOrEmail());
            auditService.recordEvent(
                    AuditEventType.AUTH_LOGIN_FAILURE,
                    null,
                    request.usernameOrEmail(),
                    "AUTH",
                    "N/A",
                    "Invalid login credentials attempt"
            );
            throw ex;
        }
    }

    @PostMapping("/logout")
    @Operation(summary = "Invalidate active session and log out")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest httpRequest, @AuthenticationPrincipal UserPrincipal principal) {
        if (principal != null) {
            userRepository.findById(principal.getId()).ifPresent(user ->
                    auditService.recordEvent(
                            AuditEventType.AUTH_LOGOUT,
                            user,
                            "SESSION",
                            httpRequest.getSession(false) != null ? httpRequest.getSession(false).getId() : "N/A",
                            "User logged out"
                    )
            );
        }

        HttpSession session = httpRequest.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();

        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully"));
    }

    @GetMapping("/me")
    @Operation(summary = "Get currently authenticated user details")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        UserResponse response = userService.getUserById(principal.getId());
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/csrf")
    @Operation(summary = "Get CSRF token for state-changing requests")
    public ResponseEntity<Map<String, String>> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            return ResponseEntity.ok(Map.of(
                    "token", csrfToken.getToken(),
                    "headerName", csrfToken.getHeaderName(),
                    "parameterName", csrfToken.getParameterName()
            ));
        }
        return ResponseEntity.ok(Map.of("message", "CSRF not active or handled via cookie"));
    }
}
