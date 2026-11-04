package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.entity.QuotaPolicy;
import com.be.scamshield.entity.ReputationRank;
import com.be.scamshield.entity.User;
import com.be.scamshield.repository.QuotaPolicyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.LongStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ScamCheckQuotaServiceTest {
    private final QuotaCounterServiceImpl counters = new QuotaCounterServiceImpl();
    private final QuotaPolicyRepository policies = mock(QuotaPolicyRepository.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-20T17:00:01Z"), ZoneId.of("UTC"));
    private ScamCheckQuotaService service;
    private final GuestSession guest = GuestSession.builder().id(42L).build();
    private static final String KEY = "quota:guest:42:2026-10-21";

    @BeforeEach
    void setUp() {
        service = new ScamCheckQuotaService(counters, policies, clock);
    }

    @Test
    void capsConcurrentRequestsAtDailyLimitAndUsesVietnamDate() throws Exception {
        when(policies.findByNameIgnoreCase("GUEST")).thenReturn(Optional.of(policy(5)));
        AtomicInteger accepted = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(8)) {
            for (int i = 0; i < 30; i++) executor.submit(() -> {
                try {
                    service.reserve(null, guest);
                    accepted.incrementAndGet();
                } catch (ResponseStatusException ex) {
                    assertThat(ex.getStatusCode().value()).isEqualTo(429);
                }
            });
        }
        assertThat(accepted.get()).isEqualTo(5);
        assertThat(counters.get(KEY)).isEqualTo(5);
    }

    @Test
    void transactionRollbackReturnsReservedSlot() {
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.reserve(null, guest);
            assertThat(counters.get(KEY)).isEqualTo(1);
            TransactionSynchronizationManager.getSynchronizations().forEach(
                    callback -> callback.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
            assertThat(counters.get(KEY)).isZero();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void zeroLimitDisablesChecksAndRankPolicyAppliesToUsers() {
        User user = User.builder().id(7L).reputationRank(ReputationRank.builder().id(2L).build()).build();
        when(policies.findByRankId(2L)).thenReturn(Optional.of(policy(0)));
        assertThatThrownBy(() -> service.reserve(user, null)).isInstanceOfSatisfying(ResponseStatusException.class,
                ex -> assertThat(ex.getStatusCode().value()).isEqualTo(429));
        assertThat(counters.get("quota:user:7:2026-10-21")).isZero();
    }

    private QuotaPolicy policy(int limit) {
        return QuotaPolicy.builder().maxChecksPerDay(limit).build();
    }

    @Test
    void registeredQuotaReadsTheSameCounterAndPolicyAsScanReservations() {
        User user = User.builder().id(7L).fullName("Nguyễn An")
                .reputationRank(ReputationRank.builder().id(2L).name("Hiệp Sĩ").build()).build();
        when(policies.findByRankId(2L)).thenReturn(Optional.of(policy(50)));
        service.reserve(user, null);

        var quota = service.getUserQuota(user);

        assertThat(quota.userId()).isEqualTo(7L);
        assertThat(quota.fullName()).isEqualTo("Nguyễn An");
        assertThat(quota.rankName()).isEqualTo("Hiệp Sĩ");
        assertThat(quota.limit()).isEqualTo(50);
        assertThat(quota.used()).isEqualTo(1);
        assertThat(quota.remaining()).isEqualTo(49);
        assertThat(quota.resetsAt()).isEqualTo(LocalDateTime.of(2026, 10, 22, 0, 0));
    }

    @Test
    void registeredQuotaUsesRegisteredPolicyWhenNoRankPolicyExists() {
        User user = User.builder().id(7L).build();
        when(policies.findByNameIgnoreCase("REGISTERED_USER")).thenReturn(Optional.of(policy(3)));
        counters.set("quota:user:7:2026-10-21", 3, Duration.ofHours(1));

        var quota = service.getUserQuota(user);

        assertThat(quota.limit()).isEqualTo(3);
        assertThat(quota.used()).isEqualTo(3);
        assertThat(quota.remaining()).isZero();
        assertThat(quota.rankName()).isNull();
    }

    @Test
    void testCounterReturnsEachAtomicIncrementValueExactlyOnce() throws Exception {
        List<Future<Long>> results = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(8)) {
            for (int i = 0; i < 100; i++) results.add(executor.submit(
                    () -> counters.incrementAndGet("sequence", Duration.ofMinutes(1))));
        }
        List<Long> values = new ArrayList<>();
        for (var result : results) values.add(result.get());
        assertThat(values).containsExactlyInAnyOrderElementsOf(LongStream.rangeClosed(1, 100).boxed().toList());
    }
}
