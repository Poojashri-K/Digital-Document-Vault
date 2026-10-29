package com.vault.repository;

import com.vault.entity.AuditEvent;
import com.vault.entity.AuditEventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    @Query("SELECT a FROM AuditEvent a WHERE " +
           "(:eventType IS NULL OR a.eventType = :eventType) AND " +
           "(:actorUsername IS NULL OR LOWER(a.actorUsername) LIKE LOWER(CONCAT('%', :actorUsername, '%'))) AND " +
           "(:resourceType IS NULL OR a.resourceType = :resourceType) AND " +
           "(:fromDate IS NULL OR a.createdAt >= :fromDate) AND " +
           "(:toDate IS NULL OR a.createdAt <= :toDate)")
    Page<AuditEvent> findFiltered(
            @Param("eventType") AuditEventType eventType,
            @Param("actorUsername") String actorUsername,
            @Param("resourceType") String resourceType,
            @Param("fromDate") Instant fromDate,
            @Param("toDate") Instant toDate,
            Pageable pageable
    );
}
