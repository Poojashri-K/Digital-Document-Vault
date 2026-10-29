package com.vault.service;

import com.vault.exception.FileValidationException;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class FileValidationService {

    private static final Logger log = LoggerFactory.getLogger(FileValidationService.class);

    private final Tika tika = new Tika();

    @Value("${vault.storage.max-file-size-bytes:20971520}") // Default 20MB
    private long maxFileSizeBytes;

    // Allowed extensions mapping to expected MIME type prefixes / patterns
    private static final Map<String, Set<String>> ALLOWED_EXTENSIONS_MAP = new HashMap<>();

    static {
        ALLOWED_EXTENSIONS_MAP.put("pdf", Set.of("application/pdf"));
        ALLOWED_EXTENSIONS_MAP.put("png", Set.of("image/png"));
        ALLOWED_EXTENSIONS_MAP.put("jpg", Set.of("image/jpeg"));
        ALLOWED_EXTENSIONS_MAP.put("jpeg", Set.of("image/jpeg"));
        ALLOWED_EXTENSIONS_MAP.put("docx", Set.of(
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/x-tika-ooxml",
                "application/zip"
        ));
        ALLOWED_EXTENSIONS_MAP.put("xlsx", Set.of(
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/x-tika-ooxml",
                "application/zip"
        ));
        ALLOWED_EXTENSIONS_MAP.put("txt", Set.of("text/plain"));
        ALLOWED_EXTENSIONS_MAP.put("csv", Set.of("text/csv", "text/plain"));
    }

    // Dangerous executable extensions and MIME types
    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "sh", "bin", "com", "vbs", "ps1", "jar", "war", "ear", "msi",
            "php", "jsp", "asp", "aspx", "cgi", "pl", "py", "elf", "scr", "pif"
    );

    private static final Set<String> BLOCKED_MIME_TYPES = Set.of(
            "application/x-dosexec",
            "application/x-executable",
            "application/x-sharedlib",
            "application/x-shellscript",
            "application/x-bat",
            "application/x-msdownload",
            "text/x-php",
            "text/html",
            "application/javascript"
    );

    private static final Pattern SAFE_FILENAME_PATTERN = Pattern.compile("^[a-zA-Z0-9._ -]+$");

    /**
     * Sanitizes a client-provided filename.
     * Prevents path traversal (AC-01) by stripping directories and dangerous characters.
     */
    public String sanitizeFilename(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            return "unnamed_document";
        }

        // Strip null bytes and control characters
        String clean = originalFilename.replace("\0", "").trim();

        // Strip directory traversal patterns: ../ or ..\
        if (clean.contains("..") || clean.contains("/") || clean.contains("\\")) {
            int lastUnixSlash = clean.lastIndexOf('/');
            int lastWinSlash = clean.lastIndexOf('\\');
            int lastIndex = Math.max(lastUnixSlash, lastWinSlash);
            if (lastIndex >= 0 && lastIndex < clean.length() - 1) {
                clean = clean.substring(lastIndex + 1);
            }
            // Strip any remaining ..
            clean = clean.replace("..", "").replace("/", "").replace("\\", "");
        }

        // Clean any forbidden characters
        clean = clean.replaceAll("[^a-zA-Z0-9._ -]", "_");

        if (clean.isBlank() || clean.equals(".") || clean.equals("..")) {
            clean = "document_" + System.currentTimeMillis();
        }

        // Limit maximum filename length
        if (clean.length() > 200) {
            String ext = getFileExtension(clean);
            String base = clean.substring(0, 190);
            clean = ext.isEmpty() ? base : base + "." + ext;
        }

        return clean;
    }

    /**
     * Comprehensive validation of an uploaded file.
     * Checks size, extension allowlist, and detected magic-bytes content type (AC-04).
     */
    public String validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new FileValidationException("Uploaded file cannot be empty");
        }

        if (file.getSize() > maxFileSizeBytes) {
            throw new FileValidationException(String.format(
                    "File size %d bytes exceeds maximum allowed limit of %d bytes",
                    file.getSize(), maxFileSizeBytes
            ));
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new FileValidationException("Filename cannot be empty");
        }

        // Check for null bytes in filename
        if (originalFilename.contains("\0")) {
            throw new FileValidationException("Malicious filename containing null bytes rejected");
        }

        String extension = getFileExtension(originalFilename).toLowerCase(Locale.ROOT);
        if (extension.isEmpty()) {
            throw new FileValidationException("Files without an extension are not allowed");
        }

        if (BLOCKED_EXTENSIONS.contains(extension)) {
            throw new FileValidationException("Executable files and scripts are strictly prohibited: ." + extension);
        }

        if (!ALLOWED_EXTENSIONS_MAP.containsKey(extension)) {
            throw new FileValidationException(String.format(
                    "Unsupported file extension '.%s'. Allowed types: %s",
                    extension, ALLOWED_EXTENSIONS_MAP.keySet()
            ));
        }

        // AC-04: Inspect actual content using Apache Tika (magic bytes)
        String detectedContentType;
        try (InputStream is = new BufferedInputStream(file.getInputStream())) {
            // Check for magic byte executable signatures
            byte[] header = new byte[8];
            is.mark(16);
            int read = is.read(header);
            is.reset();

            if (read >= 2 && header[0] == 0x4D && header[1] == 0x5A) { // 'MZ' Windows PE
                throw new FileValidationException("Malicious executable content detected (MZ header)");
            }
            if (read >= 4 && header[0] == 0x7F && header[1] == 'E' && header[2] == 'L' && header[3] == 'F') { // ELF
                throw new FileValidationException("Malicious executable content detected (ELF header)");
            }
            if (read >= 2 && header[0] == '#' && header[1] == '!') { // Shell script
                throw new FileValidationException("Executable shell script content detected");
            }

            detectedContentType = tika.detect(is, originalFilename);
        } catch (IOException e) {
            log.error("Failed to inspect file content", e);
            throw new FileValidationException("Failed to read file content for validation");
        }

        log.debug("File '{}' detected as MIME type '{}'", originalFilename, detectedContentType);

        if (BLOCKED_MIME_TYPES.contains(detectedContentType.toLowerCase(Locale.ROOT))) {
            throw new FileValidationException("Forbidden content type detected: " + detectedContentType);
        }

        // Cross-check detected content type against allowed types for this extension
        Set<String> allowedMimes = ALLOWED_EXTENSIONS_MAP.get(extension);
        boolean matches = allowedMimes.stream().anyMatch(m ->
                detectedContentType.equalsIgnoreCase(m) || detectedContentType.startsWith(m)
        );

        if (!matches) {
            // Check if text/plain for CSV
            if ("csv".equals(extension) && (detectedContentType.contains("csv") || detectedContentType.startsWith("text/"))) {
                matches = true;
            }
        }

        if (!matches) {
            throw new FileValidationException(String.format(
                    "Content type mismatch: file extension '.%s' does not match detected content type '%s'",
                    extension, detectedContentType
            ));
        }

        return detectedContentType;
    }

    public String getFileExtension(String filename) {
        if (filename == null) return "";
        int lastDot = filename.lastIndexOf('.');
        if (lastDot >= 0 && lastDot < filename.length() - 1) {
            return filename.substring(lastDot + 1);
        }
        return "";
    }
}
