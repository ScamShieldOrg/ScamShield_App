package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.testcontainers.containers.GenericContainer;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;

class PartnerRegistrationDraftStoreConcurrencyTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-13T09:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh"));

    @Test
    void inMemoryConcurrentReplacementsKeepBothDocuments() throws Exception {
        assertConcurrentReplacements(new InMemoryPartnerRegistrationDraftStore(clock));
    }

    @Test
    void redisConcurrentReplacementsKeepBothDocuments() throws Exception {
        try (var redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379)) {
            redis.start();
            var connection = new LettuceConnectionFactory(redis.getHost(), redis.getMappedPort(6379));
            connection.afterPropertiesSet();
            try {
                assertConcurrentReplacements(new RedisPartnerRegistrationDraftStore(
                        new StringRedisTemplate(connection), new ObjectMapper(), clock));
            } finally {
                connection.destroy();
            }
        }
    }

    private void assertConcurrentReplacements(PartnerRegistrationDraftStore store) throws Exception {
        var first = new PartnerRegistrationPrecheckResponse.Upload(0, "old-0", "old-0", 300);
        var second = new PartnerRegistrationPrecheckResponse.Upload(1, "old-1", "old-1", 300);
        store.save("draft", new RegisterPartnerRequest(), "verification", List.of(), null,
                List.of(first, second));
        var replacement0 = new PartnerRegistrationPrecheckResponse.Upload(0, "new-0", "new-0", 300);
        var replacement1 = new PartnerRegistrationPrecheckResponse.Upload(1, "new-1", "new-1", 300);
        var start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var update0 = executor.submit(() -> {
                start.await();
                store.replaceUpload("draft", 0, replacement0);
                return null;
            });
            var update1 = executor.submit(() -> {
                start.await();
                store.replaceUpload("draft", 1, replacement1);
                return null;
            });
            start.countDown();
            update0.get(10, TimeUnit.SECONDS);
            update1.get(10, TimeUnit.SECONDS);
        }
        store.refresh("draft");
        assertThat(store.find("draft").orElseThrow().uploads())
                .containsExactly(replacement0, replacement1);
    }
}
