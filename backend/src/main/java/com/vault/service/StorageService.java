package com.vault.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.nio.file.Path;

public interface StorageService {
    /**
     * Stores the incoming file content into protected private storage using an opaque generated key.
     * Validates path traversal, checks file size, and computes SHA-256 hash.
     *
     * @param file the multipart file to store
     * @param opaqueKey the generated opaque key
     * @return SHA-256 checksum string of the stored content
     */
    String store(MultipartFile file, String opaqueKey);

    /**
     * Stores content from an InputStream.
     */
    String store(InputStream inputStream, String opaqueKey, long expectedSize);

    /**
     * Loads the stored file as a Spring Resource.
     * Strictly validates that the resolved path does not escape the storage root.
     *
     * @param storageKey the opaque key
     * @return Resource representing the file
     */
    Resource loadAsResource(String storageKey);

    /**
     * Deletes a file from storage.
     */
    boolean delete(String storageKey);

    /**
     * Returns the root storage directory path.
     */
    Path getStorageRoot();
}
