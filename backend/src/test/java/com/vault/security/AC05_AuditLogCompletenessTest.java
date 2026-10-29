package com.vault.security;

import com.vault.dto.ShareRequest;
import com.vault.entity.AuditEvent;
import com.vault.entity.AuditEventType;
import com.vault.entity.PermissionType;
import com.vault.entity.User;
import com.vault.repository.AuditEventRepository;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("AC-05: Audit Log Completeness and Privacy Tests")
public class AC05_AuditLogCompletenessTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private ShareService shareService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditEventRepository auditEventRepository;

    private User owner;
    private User recipient;

    @BeforeEach
    void setUp() {
        owner = userRepository.findByEmailIgnoreCase("owner@vault.local").orElseThrow();
        recipient = userRepository.findByEmailIgnoreCase("colleague@vault.local").orElseThrow();
    }

    @Test
    @DisplayName("AC-05.1: Upload, Download, Share, Revoke, and Denied Access events are audited without raw file contents")
    void testAuditEventsCompletenessAndContentPrivacy() throws Exception {
        String sensitiveFileSecret = "TOP_SECRET_CONTENT_DO_NOT_LEAK_IN_LOGS";
        byte[] pdfBytes = ("%PDF-1.4 " + sensitiveFileSecret + "\n%%EOF").getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "audit_test.pdf", "application/pdf", pdfBytes);

        // 1. Upload
        var uploadRes = documentService.uploadDocument("Audit Spec Doc", "Testing logs", file, owner);
        UUID docId = uploadRes.id();

        // 2. Share
        ShareRequest shareReq = new ShareRequest(recipient.getEmail(), PermissionType.DOWNLOAD, Instant.now().plus(1, ChronoUnit.DAYS));
        var shareRes = shareService.shareDocument(docId, shareReq, owner);

        // 3. Download
        mockMvc.perform(get("/api/documents/{id}/download", docId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isOk());

        // 4. Revoke
        shareService.revokeShare(docId, shareRes.id(), owner);

        // 5. Denied Access attempt
        mockMvc.perform(get("/api/documents/{id}/download", docId)
                .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(recipient))))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.status().isForbidden());

        // Verify audit repository records
        List<AuditEvent> allEvents = auditEventRepository.findAll();
        assertFalse(allEvents.isEmpty());

        boolean hasUpload = allEvents.stream().anyMatch(e -> e.getEventType() == AuditEventType.DOCUMENT_UPLOAD && docId.toString().equals(e.getResourceId()));
        boolean hasShare = allEvents.stream().anyMatch(e -> e.getEventType() == AuditEventType.DOCUMENT_SHARE_GRANTED && docId.toString().equals(e.getResourceId()));
        boolean hasDownload = allEvents.stream().anyMatch(e -> e.getEventType() == AuditEventType.DOCUMENT_DOWNLOAD && docId.toString().equals(e.getResourceId()));
        boolean hasRevoke = allEvents.stream().anyMatch(e -> e.getEventType() == AuditEventType.DOCUMENT_SHARE_REVOKED && docId.toString().equals(e.getResourceId()));
        boolean hasDenied = allEvents.stream().anyMatch(e -> e.getEventType() == AuditEventType.ACCESS_DENIED && docId.toString().equals(e.getResourceId()));

        assertTrue(hasUpload, "DOCUMENT_UPLOAD event must be audited");
        assertTrue(hasShare, "DOCUMENT_SHARE_GRANTED event must be audited");
        assertTrue(hasDownload, "DOCUMENT_DOWNLOAD event must be audited");
        assertTrue(hasRevoke, "DOCUMENT_SHARE_REVOKED event must be audited");
        assertTrue(hasDenied, "ACCESS_DENIED event must be audited");

        // CRITICAL PRIVACY CHECK: Verify that NO audit event action details contain the sensitive document contents or passwords
        for (AuditEvent event : allEvents) {
            String details = event.getActionDetails();
            if (details != null) {
                assertFalse(details.contains(sensitiveFileSecret), "Audit log must NEVER contain document content!");
                assertFalse(details.toLowerCase().contains("password123"), "Audit log must NEVER contain plain passwords!");
            }
        }
    }
}
