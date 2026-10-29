package com.vault.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vault.dto.ErrorResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Component
public class RateLimitingFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;

    // In-memory sliding window counters: key -> (timestampMinute, count)
    private static final int MAX_LOGIN_ATTEMPTS_PER_MINUTE = 15;
    private final Map<String, RequestCounter> ipCounters = new ConcurrentHashMap<>();

    public RateLimitingFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    private static class RequestCounter {
        long minute;
        AtomicInteger count = new AtomicInteger(0);

        RequestCounter(long minute) {
            this.minute = minute;
            this.count.set(1);
        }
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String uri = request.getRequestURI();

        // Rate limit POST /api/auth/login
        if ("POST".equalsIgnoreCase(request.getMethod()) && uri.endsWith("/api/auth/login")) {
            String clientIp = getClientIp(request);
            long currentMinute = System.currentTimeMillis() / 60000;

            RequestCounter counter = ipCounters.compute(clientIp, (k, existing) -> {
                if (existing == null || existing.minute != currentMinute) {
                    return new RequestCounter(currentMinute);
                }
                existing.count.incrementAndGet();
                return existing;
            });

            if (counter.count.get() > MAX_LOGIN_ATTEMPTS_PER_MINUTE) {
                String correlationId = (String) request.getAttribute(CorrelationIdFilter.CORRELATION_ID_HEADER);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                ErrorResponse error = new ErrorResponse(
                        HttpStatus.TOO_MANY_REQUESTS.value(),
                        "Too Many Requests",
                        "Too many login attempts. Please wait before trying again.",
                        correlationId != null ? correlationId : "N/A",
                        uri
                );
                response.getWriter().write(objectMapper.writeValueAsString(error));
                return;
            }
        }

        // Clean up stale entries periodically
        if (ipCounters.size() > 5000) {
            long cutoff = (System.currentTimeMillis() / 60000) - 2;
            ipCounters.entrySet().removeIf(e -> e.getValue().minute < cutoff);
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "unknown";
    }
}
