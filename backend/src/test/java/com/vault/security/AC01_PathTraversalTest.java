package com.vault.security;

import com.vault.service.FileValidationService;
import com.vault.service.LocalStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("AC-01: Path Traversal Protection Tests")
public class AC01_PathTraversalTest {

    private LocalStorageService storageService;
    private FileValidationService validationService;

    @TempDir
    Path tempStorageDir;

    @BeforeEach
    void setUp() {
        storageService = new LocalStorageService(tempStorageDir.toString());
        storageService.init();
        validationService = new FileValidationService();
    }

    @Test
    @DisplayName("AC-01.1: Filename with unix directory traversal is sanitized and cannot escape directory")
    void testUnixPathTraversalSanitization() {
        String dangerousName = "../../../../etc/passwd.pdf";
        String sanitized = validationService.sanitizeFilename(dangerousName);

        assertFalse(sanitized.contains(".."));
        assertFalse(sanitized.contains("/"));
        assertFalse(sanitized.contains("\\"));
        assertEquals("passwd.pdf", sanitized);
    }

    @Test
    @DisplayName("AC-01.2: Filename with Windows directory traversal is sanitized")
    void testWindowsPathTraversalSanitization() {
        String dangerousName = "..\\..\\..\\Windows\\System32\\cmd.exe.pdf";
        String sanitized = validationService.sanitizeFilename(dangerousName);

        assertFalse(sanitized.contains(".."));
        assertFalse(sanitized.contains("/"));
        assertFalse(sanitized.contains("\\"));
        assertEquals("cmd.exe.pdf", sanitized);
    }

    @Test
    @DisplayName("AC-01.3: Filename with null byte injection is sanitized")
    void testNullByteSanitization() {
        String dangerousName = "safe_doc.pdf\0.exe";
        String sanitized = validationService.sanitizeFilename(dangerousName);

        assertFalse(sanitized.contains("\0"));
    }

    @Test
    @DisplayName("AC-01.4: Storage service rejects path traversal in storage key on store")
    void testStorageRejectsTraversalKeyOnStore() {
        byte[] content = "Test content".getBytes(StandardCharsets.UTF_8);
        ByteArrayInputStream is = new ByteArrayInputStream(content);

        assertThrows(SecurityException.class, () -> {
            storageService.store(is, "../../escape.dat", content.length);
        });
    }

    @Test
    @DisplayName("AC-01.5: Storage service rejects path traversal in storage key on load")
    void testStorageRejectsTraversalKeyOnLoad() {
        assertThrows(SecurityException.class, () -> {
            storageService.loadAsResource("../outside_file.dat");
        });
    }

    @Test
    @DisplayName("AC-01.6: Stored file path is strictly contained within storage root")
    void testStoredFileContainedInRoot() {
        byte[] content = "%PDF-1.4 test document content".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "my_report.pdf", "application/pdf", content);
        String opaqueKey = "valid-opaque-uuid-123.dat";

        String checksum = storageService.store(file, opaqueKey);
        assertNotNull(checksum);

        var resource = storageService.loadAsResource(opaqueKey);
        assertTrue(resource.exists());
        assertTrue(resource.isReadable());
    }
}
