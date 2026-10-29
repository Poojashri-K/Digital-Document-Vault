package com.vault.security;

import com.vault.exception.FileValidationException;
import com.vault.service.FileValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("AC-04: Content-Type & Executable Validation Tests")
public class AC04_ContentTypeValidationTest {

    private FileValidationService validationService;

    @BeforeEach
    void setUp() {
        validationService = new FileValidationService();
        ReflectionTestUtils.setField(validationService, "maxFileSizeBytes", 10 * 1024 * 1024); // 10MB
    }

    @Test
    @DisplayName("AC-04.1: Valid PDF with correct magic bytes is accepted")
    void testValidPdfAccepted() {
        byte[] pdfContent = "%PDF-1.5 \n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF".getBytes(StandardCharsets.ISO_8859_1);
        MockMultipartFile file = new MockMultipartFile("file", "annual_report.pdf", "application/pdf", pdfContent);

        String detectedType = validationService.validateFile(file);
        assertEquals("application/pdf", detectedType);
    }

    @Test
    @DisplayName("AC-04.2: Valid PNG with correct magic bytes is accepted")
    void testValidPngAccepted() {
        // PNG header: 89 50 4E 47 0D 0A 1A 0A
        byte[] pngHeader = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 'I', 'H', 'D', 'R'};
        MockMultipartFile file = new MockMultipartFile("file", "chart.png", "image/png", pngHeader);

        String detectedType = validationService.validateFile(file);
        assertEquals("image/png", detectedType);
    }

    @Test
    @DisplayName("AC-04.3: Executable with .exe extension is immediately rejected")
    void testExecutableExtensionRejected() {
        byte[] dummy = "MZ dummy executable".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "malware.exe", "application/x-msdownload", dummy);

        FileValidationException ex = assertThrows(FileValidationException.class, () -> validationService.validateFile(file));
        assertTrue(ex.getMessage().contains("Executable files"));
    }

    @Test
    @DisplayName("AC-04.4: Disguised Windows executable (.pdf with MZ header) is rejected via magic byte detection")
    void testDisguisedMzExecutableRejected() {
        // MZ header: 4D 5A
        byte[] mzPayload = new byte[]{0x4D, 0x5A, (byte) 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "invoice.pdf", "application/pdf", mzPayload);

        FileValidationException ex = assertThrows(FileValidationException.class, () -> validationService.validateFile(file));
        assertTrue(ex.getMessage().contains("Malicious executable content detected"));
    }

    @Test
    @DisplayName("AC-04.5: Disguised Linux executable (.png with ELF header) is rejected via magic byte detection")
    void testDisguisedElfExecutableRejected() {
        // ELF header: 7F 45 4C 46
        byte[] elfPayload = new byte[]{0x7F, 'E', 'L', 'F', 0x02, 0x01, 0x01, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", elfPayload);

        FileValidationException ex = assertThrows(FileValidationException.class, () -> validationService.validateFile(file));
        assertTrue(ex.getMessage().contains("ELF header"));
    }

    @Test
    @DisplayName("AC-04.6: Disguised Shell script (.txt with #! header) is rejected")
    void testDisguisedShellScriptRejected() {
        byte[] script = "#!/bin/bash\nrm -rf /".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "notes.txt", "text/plain", script);

        FileValidationException ex = assertThrows(FileValidationException.class, () -> validationService.validateFile(file));
        assertTrue(ex.getMessage().contains("Executable shell script"));
    }

    @Test
    @DisplayName("AC-04.7: Mismatched content (HTML inside .pdf) is rejected")
    void testMismatchedContentRejected() {
        byte[] htmlContent = "<html><body><script>alert(1)</script></body></html>".getBytes(StandardCharsets.UTF_8);
        MockMultipartFile file = new MockMultipartFile("file", "document.pdf", "application/pdf", htmlContent);

        FileValidationException ex = assertThrows(FileValidationException.class, () -> validationService.validateFile(file));
        assertTrue(ex.getMessage().contains("mismatch") || ex.getMessage().contains("Forbidden content"));
    }

    @Test
    @DisplayName("AC-04.8: Oversized file exceeding limit is rejected")
    void testOversizedFileRejected() {
        ReflectionTestUtils.setField(validationService, "maxFileSizeBytes", 1024); // 1KB limit
        byte[] large = new byte[2048];
        MockMultipartFile file = new MockMultipartFile("file", "data.txt", "text/plain", large);

        FileValidationException ex = assertThrows(FileValidationException.class, () -> validationService.validateFile(file));
        assertTrue(ex.getMessage().contains("exceeds maximum allowed limit"));
    }
}
