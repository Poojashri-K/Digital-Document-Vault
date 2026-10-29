package com.vault.performance;

import com.vault.dto.DocumentSummaryResponse;
import com.vault.dto.PagedResponse;
import com.vault.entity.User;
import com.vault.repository.UserRepository;
import com.vault.security.UserPrincipal;
import com.vault.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Performance Benchmark: 25 Concurrent Users")
public class ConcurrencyPerformanceTest {

    private static final Logger log = LoggerFactory.getLogger(ConcurrencyPerformanceTest.class);

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private UserRepository userRepository;

    private User owner;

    @BeforeEach
    void seedDocuments() {
        owner = userRepository.findByEmailIgnoreCase("owner@vault.local").orElseThrow();

        // Seed 15 documents if not already seeded
        for (int i = 1; i <= 15; i++) {
            byte[] content = ("%PDF-1.4 Perf Benchmark sample data " + i + "\n%%EOF").getBytes(StandardCharsets.UTF_8);
            MockMultipartFile file = new MockMultipartFile("file", "perf_doc_" + i + ".pdf", "application/pdf", content);
            try {
                documentService.uploadDocument("Performance Test Document " + i, "Benchmarking payload", file, owner);
            } catch (Exception ignored) {
            }
        }
    }

    @Test
    @DisplayName("Performance Benchmark: p95 response time < 2.0s with 25 concurrent users")
    void testConcurrentListOperationsUnder25Users() throws Exception {
        int concurrentUsers = 25;
        int requestsPerUser = 4;
        int totalRequests = concurrentUsers * requestsPerUser;

        ExecutorService executor = Executors.newFixedThreadPool(concurrentUsers);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(totalRequests);

        List<Long> responseTimesMs = Collections.synchronizedList(new ArrayList<>());
        List<Throwable> errors = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < totalRequests; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await(); // Synchronize all threads to start at the exact same moment
                    long start = System.nanoTime();

                    mockMvc.perform(get("/api/documents?page=0&size=10&sortBy=createdAt&sortDirection=DESC")
                            .with(SecurityMockMvcRequestPostProcessors.user(new UserPrincipal(owner))))
                            .andExpect(status().isOk());

                    long durationMs = (System.nanoTime() - start) / 1_000_000;
                    responseTimesMs.add(durationMs);
                } catch (Throwable t) {
                    errors.add(t);
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        long overallStart = System.currentTimeMillis();
        startLatch.countDown(); // Fire all concurrent threads simultaneously
        boolean completed = finishLatch.await(30, TimeUnit.SECONDS);
        long overallDuration = System.currentTimeMillis() - overallStart;

        executor.shutdown();

        assertTrue(completed, "All requests should complete within 30 seconds");
        assertTrue(errors.isEmpty(), "Zero errors expected during concurrent benchmark, but got: " + errors.size());
        assertEquals(totalRequests, responseTimesMs.size());

        Collections.sort(responseTimesMs);

        long min = responseTimesMs.get(0);
        long max = responseTimesMs.get(responseTimesMs.size() - 1);
        double avg = responseTimesMs.stream().mapToLong(Long::longValue).average().orElse(0.0);
        long p50 = responseTimesMs.get((int) (responseTimesMs.size() * 0.50));
        long p90 = responseTimesMs.get((int) (responseTimesMs.size() * 0.90));
        long p95 = responseTimesMs.get((int) (responseTimesMs.size() * 0.95));
        long p99 = responseTimesMs.get((int) (responseTimesMs.size() * 0.99));

        double throughputRps = (totalRequests * 1000.0) / overallDuration;

        System.out.println("=================================================");
        System.out.println(">>> DIGITAL DOCUMENT VAULT PERFORMANCE REPORT <<<");
        System.out.println("=================================================");
        System.out.println(String.format("Concurrent Users:     %d", concurrentUsers));
        System.out.println(String.format("Total Requests:       %d", totalRequests));
        System.out.println(String.format("Overall Test Time:    %d ms", overallDuration));
        System.out.println(String.format("Throughput:           %.2f req/sec", throughputRps));
        System.out.println(String.format("Min Response Time:    %d ms", min));
        System.out.println(String.format("Average Response Time:%.2f ms", avg));
        System.out.println(String.format("p50 Response Time:    %d ms", p50));
        System.out.println(String.format("p90 Response Time:    %d ms", p90));
        System.out.println(String.format("p95 Response Time:    %d ms", p95));
        System.out.println(String.format("p99 Response Time:    %d ms", p99));
        System.out.println(String.format("Max Response Time:    %d ms", max));
        System.out.println("=================================================");

        // Target: p95 < 2,000 ms (2.0 seconds) as required in PDF Section 7 Non-Functional Requirements
        assertTrue(p95 < 2000, "p95 response time must be under 2000ms, measured: " + p95 + "ms");
    }

    private void assertEquals(int expected, int actual) {
        org.junit.jupiter.api.Assertions.assertEquals(expected, actual);
    }
}
