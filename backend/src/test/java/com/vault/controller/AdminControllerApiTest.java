package com.vault.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vault.dto.UserStatusUpdateRequest;
import com.vault.entity.User;
import com.vault.entity.UserStatus;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Role-Based Access Control and Privilege Escalation Tests")
public class AdminControllerApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User regularUser;
    private User vaultAdmin;
    private User systemAdmin;

    @BeforeEach
    void setUp() {
        regularUser = userRepository.findByEmailIgnoreCase("owner@vault.local").orElseThrow();
        vaultAdmin = userRepository.findByEmailIgnoreCase("vaultadmin@vault.local").orElseThrow();
        systemAdmin = userRepository.findByEmailIgnoreCase("sysadmin@vault.local").orElseThrow();
    }

    @Test
    @DisplayName("RBAC.1: Regular user cannot access /api/admin/audit-logs (Vertical Escalation Blocked)")
    void testRegularUserCannotAccessAuditLogs() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs")
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(regularUser))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RBAC.2: Regular user cannot access /api/admin/users (Vertical Escalation Blocked)")
    void testRegularUserCannotAccessUsersManagement() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(regularUser))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RBAC.3: Vault Administrator can access audit logs")
    void testVaultAdminCanAccessAuditLogs() throws Exception {
        mockMvc.perform(get("/api/admin/audit-logs")
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(vaultAdmin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("RBAC.4: Vault Administrator cannot access /api/admin/users (Separation of Duties)")
    void testVaultAdminCannotManageUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(vaultAdmin))))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("RBAC.5: System Administrator can access /api/admin/users and update user status")
    void testSystemAdminCanManageUsers() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(systemAdmin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        UserStatusUpdateRequest updateReq = new UserStatusUpdateRequest(UserStatus.LOCKED);
        mockMvc.perform(patch("/api/admin/users/{id}/status", regularUser.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updateReq))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(systemAdmin))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("LOCKED"));

        // Restore status to ACTIVE so downstream tests remain unaffected
        UserStatusUpdateRequest restoreReq = new UserStatusUpdateRequest(UserStatus.ACTIVE);
        mockMvc.perform(patch("/api/admin/users/{id}/status", regularUser.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(restoreReq))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(systemAdmin))))
                .andExpect(status().isOk());
    }
}
