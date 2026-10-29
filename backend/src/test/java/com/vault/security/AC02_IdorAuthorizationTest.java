package com.vault.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vault.entity.Role;
import com.vault.entity.User;
import com.vault.repository.DocumentRepository;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("AC-02: BOLA / IDOR Authorization Tests")
public class AC02_IdorAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private DocumentRepository documentRepository;

    private User owner;
    private User otherUser;
    private User sysAdmin;
    private UUID documentId;

    @BeforeEach
    void setUp() {
        owner = userRepository.findByEmailIgnoreCase("owner@vault.local").orElseThrow();
        otherUser = userRepository.findByEmailIgnoreCase("colleague@vault.local").orElseThrow();
        sysAdmin = userRepository.findByEmailIgnoreCase("sysadmin@vault.local").orElseThrow();

        // Upload a document as owner
        byte[] pdfBytes = "%PDF-1.4 test document content\n%%EOF".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "owner_secret.pdf", "application/pdf", pdfBytes);
        var summary = documentService.uploadDocument("Confidential Strategy", "Secret plan", file, owner);
        documentId = summary.id();
    }

    @Test
    @DisplayName("AC-02.1: Owner can download their own document")
    void testOwnerCanDownload() throws Exception {
        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(owner))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("AC-02.2: User B cannot download User A's unshared document by guessing UUID (AC-02)")
    void testUnsharedUserCannotDownload() throws Exception {
        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(otherUser))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.message").value("No active share permission found"));
    }

    @Test
    @DisplayName("AC-02.3: User B cannot read User A's unshared document metadata by guessing UUID")
    void testUnsharedUserCannotReadMetadata() throws Exception {
        mockMvc.perform(get("/api/documents/{id}/metadata", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(otherUser))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("Forbidden"));
    }

    @Test
    @DisplayName("AC-02.4: System Administrator cannot download private business documents (Least Privilege)")
    void testSystemAdminCannotDownloadDocument() throws Exception {
        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(sysAdmin))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("System administrators are not permitted to download business documents"));
    }

    @Test
    @DisplayName("AC-02.5: Non-existent document ID returns 404")
    void testNonExistentDocumentReturns404() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        mockMvc.perform(get("/api/documents/{id}/metadata", nonExistentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(owner))))
                .andExpect(status().isNotFound());
    }
}
