package com.vault.repository;

import com.vault.entity.DocumentPermission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentPermissionRepository extends JpaRepository<DocumentPermission, UUID> {

    @Query("SELECT p FROM DocumentPermission p WHERE p.document.id = :documentId AND p.user.id = :userId " +
           "AND p.active = true AND p.revokedAt IS NULL " +
           "AND (p.expiresAt IS NULL OR p.expiresAt > :now)")
    Optional<DocumentPermission> findActivePermission(
            @Param("documentId") UUID documentId,
            @Param("userId") UUID userId,
            @Param("now") Instant now
    );

    List<DocumentPermission> findByDocumentIdAndActiveTrue(UUID documentId);

    List<DocumentPermission> findByDocumentId(UUID documentId);

    @Query("SELECT p FROM DocumentPermission p WHERE p.user.id = :userId " +
           "AND p.active = true AND p.revokedAt IS NULL " +
           "AND (p.expiresAt IS NULL OR p.expiresAt > :now) " +
           "AND p.document.status <> 'DELETED' AND " +
           "(:query IS NULL OR LOWER(p.document.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(p.document.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<DocumentPermission> findActiveSharedWithUser(
            @Param("userId") UUID userId,
            @Param("now") Instant now,
            @Param("query") String query,
            Pageable pageable
    );

    Optional<DocumentPermission> findByDocumentIdAndUserIdAndActiveTrue(UUID documentId, UUID userId);

    Optional<DocumentPermission> findFirstByDocumentIdAndUserIdOrderByCreatedAtDesc(UUID documentId, UUID userId);
}
