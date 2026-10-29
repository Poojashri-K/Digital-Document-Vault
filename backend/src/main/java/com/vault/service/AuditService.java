package com.vault.service;

import com.vault.dto.AuditEventResponse;
import com.vault.dto.PagedResponse;
import com.vault.entity.AuditEvent;
import com.vault.entity.AuditEventType;
import com.vault.entity.User;
import com.vault.repository.AuditEventRepository;
import com.vault.security.CorrelationIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Instant;
import java.util.UUID;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditEventRepository auditEventRepository;

    public AuditService(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    /**
     * AC-05: Logs an auditable event with actor, resource, action details, IP, and correlation ID.
     * Strictly verifies that no sensitive content/secrets are logged.
     */
    @Transactional
    public void recordEvent(AuditEventType eventType, User actor, String resourceType, String resourceId, String actionDetails) {
        UUID actorId = actor != null ? actor.getId() : null;
        String actorUsername = actor != null ? actor.getUsername() : "anonymous";
        recordEvent(eventType, actorId, actorUsername, resourceType, resourceId, actionDetails);
    }

    @Transactional
    public void recordEvent(AuditEventType eventType, UUID actorId, String actorUsername,
                            String resourceType, String resourceId, String actionDetails) {
        String ipAddress = "unknown";
        String userAgent = "unknown";
        String correlationId = "N/A";

        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                correlationId = (String) req.getAttribute(CorrelationIdFilter.CORRELATION_ID_HEADER);
                if (correlationId == null) {
                    correlationId = req.getHeader(CorrelationIdFilter.CORRELATION_ID_HEADER);
                }
                String xf = req.getHeader("X-Forwarded-For");
                ipAddress = (xf != null && !xf.isBlank()) ? xf.split(",")[0].trim() : req.getRemoteAddr();
                userAgent = req.getHeader("User-Agent");
                if (userAgent != null && userAgent.length() > 500) {
                    userAgent = userAgent.substring(0, 500);
                }
            }
        } catch (Exception e) {
            log.trace("Could not extract request attributes for audit log", e);
        }

        AuditEvent event = new AuditEvent(
                UUID.randomUUID(),
                eventType,
                actorId,
                actorUsername != null ? actorUsername : "anonymous",
                resourceType,
                resourceId,
                actionDetails,
                ipAddress,
                userAgent,
                correlationId != null ? correlationId : "N/A"
        );

        auditEventRepository.save(event);
        log.info("[AUDIT] Type: {} | Actor: {} | Resource: {}:{} | IP: {} | CID: {}",
                eventType, actorUsername, resourceType, resourceId, ipAddress, correlationId);
    }

    @Transactional(readOnly = true)
    public PagedResponse<AuditEventResponse> getAuditLogs(
            AuditEventType eventType,
            String actorUsername,
            String resourceType,
            Instant fromDate,
            Instant toDate,
            int page,
            int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<AuditEvent> eventPage = auditEventRepository.findFiltered(
                eventType,
                (actorUsername != null && !actorUsername.isBlank()) ? actorUsername.trim() : null,
                (resourceType != null && !resourceType.isBlank()) ? resourceType.trim() : null,
                fromDate,
                toDate,
                pageable
        );

        Page<AuditEventResponse> dtoPage = eventPage.map(e -> new AuditEventResponse(
                e.getId(),
                e.getEventType(),
                e.getActorId(),
                e.getActorUsername(),
                e.getResourceType(),
                e.getResourceId(),
                e.getActionDetails(),
                e.getIpAddress(),
                e.getUserAgent(),
                e.getCorrelationId(),
                e.getCreatedAt()
        ));

        return PagedResponse.from(dtoPage);
    }
}
