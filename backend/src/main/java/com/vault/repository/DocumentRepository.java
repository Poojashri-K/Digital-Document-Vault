package com.vault.repository;

import com.vault.entity.Document;
import com.vault.entity.DocumentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface DocumentRepository extends JpaRepository<Document, UUID> {

    @Query("SELECT d FROM Document d WHERE d.owner.id = :ownerId AND d.status = :status AND " +
           "(:query IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(d.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Document> findByOwnerAndStatusAndSearch(
            @Param("ownerId") UUID ownerId,
            @Param("status") DocumentStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    @Query("SELECT d FROM Document d WHERE d.owner.id = :ownerId AND d.status <> 'DELETED' AND " +
           "(:query IS NULL OR LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(d.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Document> findByOwnerAndNotDeletedAndSearch(
            @Param("ownerId") UUID ownerId,
            @Param("query") String query,
            Pageable pageable
    );

    Optional<Document> findByIdAndStatusNot(UUID id, DocumentStatus status);
}
