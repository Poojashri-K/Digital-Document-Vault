package com.vault.repository;

import com.vault.entity.DownloadEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DownloadEventRepository extends JpaRepository<DownloadEvent, UUID> {
    List<DownloadEvent> findByDocumentIdOrderByDownloadedAtDesc(UUID documentId);
    Page<DownloadEvent> findByUserIdOrderByDownloadedAtDesc(UUID userId, Pageable pageable);
}
