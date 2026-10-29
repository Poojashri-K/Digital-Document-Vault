package com.vault.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vault.dto.ShareRequest;
import com.vault.dto.ShareResponse;
import com.vault.entity.PermissionType;
import com.vault.entity.User;
import com.vault.repository.DocumentPermissionRepository;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.DocumentService;
import com.vault.service.ShareService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("AC-03: Revoked and Expired Share Authorization Tests")
public class AC03_RevokedAndExpiredSharesTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private ShareService shareService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    private User owner;
    private User recipient;
    private UUID documentId;

    @BeforeEach
    void setUp() {
        owner = userRepository.findByEmailIgnoreCase("owner@vault.local").orElseThrow();
        recipient = userRepository.findByEmailIgnoreCase("colleague@vault.local").orElseThrow();

        byte[] pdfBytes = "%PDF-1.4 sample content\n%%EOF".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "project_brief.pdf", "application/pdf", pdfBytes);
        var summary = documentService.uploadDocument("Quarterly Report", "Confidential financial brief", file, owner);
        documentId = summary.id();
    }

    @Test
    @DisplayName("AC-03.1: Active share with DOWNLOAD permission succeeds")
    void testActiveDownloadShareSucceeds() throws Exception {
        ShareRequest shareRequest = new ShareRequest(recipient.getEmail(), PermissionType.DOWNLOAD, Instant.now().plus(1, ChronoUnit.DAYS));
        shareService.shareDocument(documentId, shareRequest, owner);

        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("AC-03.2: Revoked share fails immediately upon subsequent download (AC-03)")
    void testRevokedShareFailsImmediately() throws Exception {
        ShareRequest shareRequest = new ShareRequest(recipient.getEmail(), PermissionType.DOWNLOAD, Instant.now().plus(1, ChronoUnit.DAYS));
        ShareResponse share = shareService.shareDocument(documentId, shareRequest, owner);

        // Verify recipient can initially download
        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isOk());

        // Owner revokes share
        shareService.revokeShare(documentId, share.id(), owner);

        // Subsequent download must fail immediately with 403 Forbidden
        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Share permission has been revoked"));
    }

    @Autowired
    private DocumentPermissionRepository permissionRepository;

    @Test
    @DisplayName("AC-03.3: Expired share fails immediately upon download (AC-03)")
    void testExpiredShareFailsImmediately() throws Exception {
        ShareRequest shareRequest = new ShareRequest(recipient.getEmail(), PermissionType.DOWNLOAD, Instant.now().plus(1, ChronoUnit.HOURS));
        ShareResponse share = shareService.shareDocument(documentId, shareRequest, owner);

        // Simulate time passage by setting expiresAt to the past
        var perm = permissionRepository.findById(share.id()).orElseThrow();
        perm.setExpiresAt(Instant.now().minus(1, ChronoUnit.MINUTES));
        permissionRepository.save(perm);

        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Share permission has expired")));
    }

    @Test
    @DisplayName("AC-03.4: VIEW permission allows metadata view but blocks binary download")
    void testViewPermissionBlocksDownload() throws Exception {
        ShareRequest shareRequest = new ShareRequest(recipient.getEmail(), PermissionType.VIEW, Instant.now().plus(1, ChronoUnit.DAYS));
        shareService.shareDocument(documentId, shareRequest, owner);

        // Metadata view succeeds
        mockMvc.perform(get("/api/documents/{id}/metadata", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.userPermission").value("VIEW"));

        // Binary download is denied
        mockMvc.perform(get("/api/documents/{id}/download", documentId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Document share permission allows VIEW only; download is prohibited"));
    }

    @Test
    @DisplayName("AC-03.5: Recipient cannot re-share document to another user")
    void testRecipientCannotReshare() throws Exception {
        ShareRequest shareRequest = new ShareRequest(recipient.getEmail(), PermissionType.DOWNLOAD, Instant.now().plus(1, ChronoUnit.DAYS));
        shareService.shareDocument(documentId, shareRequest, owner);

        User thirdUser = userRepository.findByEmailIgnoreCase("vaultadmin@vault.local").orElseThrow();
        ShareRequest unauthorizedShare = new ShareRequest(thirdUser.getEmail(), PermissionType.VIEW, null);

        mockMvc.perform(post("/api/documents/{id}/shares", documentId)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(unauthorizedShare))
                .with(SecurityMockMvcRequestPostProcessors.csrf())
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Only the document owner can grant share permissions"));
    }
}
