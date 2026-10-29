package com.vault.service;

import com.vault.exception.FileStorageException;
import com.vault.exception.ResourceNotFoundException;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.*;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Service
public class LocalStorageService implements StorageService {

    private static final Logger log = LoggerFactory.getLogger(LocalStorageService.class);

    private final Path rootLocation;

    public LocalStorageService(@Value("${vault.storage.location:vault_storage}") String storageLocation) {
        this.rootLocation = Paths.get(storageLocation).toAbsolutePath().normalize();
    }

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
            log.info("Initialized secure local file storage at {}", rootLocation);
        } catch (IOException e) {
            throw new FileStorageException("Could not initialize storage directory: " + rootLocation, e);
        }
    }

    @Override
    public String store(MultipartFile file, String opaqueKey) {
        try {
            if (file.isEmpty()) {
                throw new FileStorageException("Failed to store empty file");
            }
            return store(file.getInputStream(), opaqueKey, file.getSize());
        } catch (IOException e) {
            throw new FileStorageException("Failed to read file input stream", e);
        }
    }

    @Override
    public String store(InputStream inputStream, String opaqueKey, long expectedSize) {
        try {
            // AC-01: Ensure opaqueKey cannot escape root directory
            if (opaqueKey.contains("..") || opaqueKey.contains("/") || opaqueKey.contains("\\")) {
                throw new SecurityException("Path traversal attempt blocked in storage key: " + opaqueKey);
            }

            Path destinationFile = this.rootLocation.resolve(opaqueKey).normalize().toAbsolutePath();
            if (!destinationFile.startsWith(this.rootLocation)) {
                throw new SecurityException("Cannot store file outside current storage directory");
            }

            MessageDigest md = MessageDigest.getInstance("SHA-256");
            try (DigestInputStream dis = new DigestInputStream(inputStream, md)) {
                Files.copy(dis, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }

            String sha256 = HexFormat.of().formatHex(md.digest());
            log.debug("Stored file with opaque key '{}' (SHA-256: {})", opaqueKey, sha256);
            return sha256;
        } catch (NoSuchAlgorithmException e) {
            throw new FileStorageException("SHA-256 algorithm not available", e);
        } catch (IOException e) {
            throw new FileStorageException("Failed to store file with key: " + opaqueKey, e);
        }
    }

    @Override
    public Resource loadAsResource(String storageKey) {
        try {
            // AC-01: Path traversal protection
            if (storageKey.contains("..") || storageKey.contains("/") || storageKey.contains("\\")) {
                throw new SecurityException("Path traversal attempt blocked in storage key: " + storageKey);
            }

            Path file = rootLocation.resolve(storageKey).normalize().toAbsolutePath();
            if (!file.startsWith(rootLocation)) {
                throw new SecurityException("Cannot access file outside current storage directory: " + storageKey);
            }

            if (!Files.exists(file) || !Files.isReadable(file)) {
                throw new ResourceNotFoundException("Stored file not found or unreadable: " + storageKey);
            }

            Resource resource = new UrlResource(file.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("Stored file cannot be read: " + storageKey);
            }
        } catch (MalformedURLException e) {
            throw new FileStorageException("Malformed URI for storage key: " + storageKey, e);
        }
    }

    @Override
    public boolean delete(String storageKey) {
        try {
            if (storageKey.contains("..") || storageKey.contains("/") || storageKey.contains("\\")) {
                throw new SecurityException("Path traversal attempt blocked: " + storageKey);
            }
            Path file = rootLocation.resolve(storageKey).normalize().toAbsolutePath();
            if (!file.startsWith(rootLocation)) {
                throw new SecurityException("Cannot delete file outside storage directory");
            }
            return Files.deleteIfExists(file);
        } catch (IOException e) {
            log.error("Failed to delete stored file: {}", storageKey, e);
            return false;
        }
    }

    @Override
    public Path getStorageRoot() {
        return rootLocation;
    }
}
