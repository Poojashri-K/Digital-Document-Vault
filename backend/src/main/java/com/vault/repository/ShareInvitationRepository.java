package com.vault.repository;

import com.vault.entity.ShareInvitation;
import com.vault.entity.ShareStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ShareInvitationRepository extends JpaRepository<ShareInvitation, UUID> {
    Optional<ShareInvitation> findByToken(String token);
    List<ShareInvitation> findByDocumentIdAndStatus(UUID documentId, ShareStatus status);
    List<ShareInvitation> findByRecipientEmailIgnoreCaseAndStatus(String recipientEmail, ShareStatus status);
}
