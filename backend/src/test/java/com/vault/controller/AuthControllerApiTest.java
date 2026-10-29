package com.vault.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vault.dto.LoginRequest;
import com.vault.dto.RegisterRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("Authentication API & Security Tests")
public class AuthControllerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Auth.1: Registration succeeds with valid 12+ character password")
    void testRegisterSuccess() throws Exception {
        RegisterRequest request = new RegisterRequest("new_vault_user", "newuser@vault.local", "New User", "StrongPassword123!");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.username").value("new_vault_user"))
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"));
    }

    @Test
    @DisplayName("Auth.2: Registration fails when password is less than 12 characters")
    void testRegisterWeakPasswordRejected() throws Exception {
        RegisterRequest request = new RegisterRequest("weak_user", "weak@vault.local", "Weak User", "Short123!");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.password").exists());
    }

    @Test
    @DisplayName("Auth.3: Registration fails on duplicate username or email")
    void testRegisterDuplicateRejected() throws Exception {
        RegisterRequest duplicate = new RegisterRequest("doc_owner", "owner@vault.local", "Duplicate Owner", "SecurePassword123!");

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(duplicate)))
                .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("Auth.4: Successful login establishes session and /me returns authenticated user")
    void testLoginAndSessionPersistence() throws Exception {
        LoginRequest loginRequest = new LoginRequest("owner@vault.local", "OwnerPassword123!");

        var mvcResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("owner@vault.local"))
                .andReturn();

        MockHttpSession session = (MockHttpSession) mvcResult.getRequest().getSession(false);
        org.junit.jupiter.api.Assertions.assertNotNull(session);

        // Verify session persists to /api/auth/me
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("doc_owner"));
    }

    @Test
    @DisplayName("Auth.5: Bad credentials returns 401 Unauthorized")
    void testBadCredentials() throws Exception {
        LoginRequest badLogin = new LoginRequest("owner@vault.local", "WrongPassword123!");

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(badLogin)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }

    @Test
    @DisplayName("Auth.6: Logout invalidates the session")
    void testLogoutInvalidatesSession() throws Exception {
        LoginRequest loginRequest = new LoginRequest("owner@vault.local", "OwnerPassword123!");

        var mvcResult = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        MockHttpSession session = (MockHttpSession) mvcResult.getRequest().getSession(false);

        // Logout
        mockMvc.perform(post("/api/auth/logout").session(session))
                .andExpect(status().isOk());

        // Accessing /api/auth/me with the invalidated session returns 401
        mockMvc.perform(get("/api/auth/me").session(session))
                .andExpect(status().isUnauthorized());
    }
}
