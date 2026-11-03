package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.entity.CheckVerdict;
import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.repository.CheckRequestRepository;
import com.be.scamshield.repository.CheckVerdictRepository;
import com.be.scamshield.repository.ExtractedIocRepository;
import com.be.scamshield.repository.QuotaPolicyRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IGuestSessionService;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ScamCheckFailureQuotaTest {
    enum FailureStage { REQUEST_SAVE, AI_DECISION, VERDICT_SAVE }

    @ParameterizedTest
    @EnumSource(FailureStage.class)
    void failedCheckReleasesReservedQuota(FailureStage stage) {
        var checks = mock(CheckRequestRepository.class);
        var verdicts = mock(CheckVerdictRepository.class);
        var sessions = mock(IGuestSessionService.class);
        var decisions = mock(ScamCheckDecisionService.class);
        var manager = mock(PlatformTransactionManager.class);
        var clock = Clock.fixed(Instant.parse("2026-11-03T00:00:00Z"), ZoneOffset.UTC);
        var counters = new QuotaCounterServiceImpl();
        var quotas = new ScamCheckQuotaService(counters, mock(QuotaPolicyRepository.class), clock);
        var service = new ScamCheckServiceImpl(checks, verdicts, mock(ExtractedIocRepository.class),
                mock(UserRepository.class), sessions, new ScamCheckInputProcessor(), decisions, quotas, clock, manager);
        ReflectionTestUtils.setField(service, "retentionDays", 30);
        when(sessions.getValidSession("guest-token")).thenReturn(GuestSession.builder().id(42L).build());
        when(manager.getTransaction(any())).thenAnswer(invocation -> new SimpleTransactionStatus());
        var failure = new IllegalStateException("Controlled failure at " + stage);
        var saved = new AtomicReference<CheckRequest>();
        when(checks.save(any())).thenAnswer(invocation -> {
            if (stage == FailureStage.REQUEST_SAVE) throw failure;
            CheckRequest check = invocation.getArgument(0);
            check.setId(1L);
            saved.set(check);
            return check;
        });
        if (stage == FailureStage.AI_DECISION) {
            when(decisions.decide(any(), anyList())).thenThrow(failure);
        } else if (stage == FailureStage.VERDICT_SAVE) {
            when(decisions.decide(any(), anyList())).thenReturn(new ScamCheckDecisionService.Decision(
                    CheckVerdict.builder().verdict("UNKNOWN").build(), List.of()));
            when(checks.findById(1L)).thenAnswer(invocation -> Optional.of(saved.get()));
            when(verdicts.saveAndFlush(any())).thenThrow(failure);
        }
        var request = new ScamCheckRequest();
        request.setInputType("MESSAGE");
        request.setContent("Bạn kiểm tra giúp thông báo này nhé");
        assertThatThrownBy(() -> service.check(request, null, "guest-token")).isSameAs(failure);
        assertThat(counters.get("quota:guest:42:2026-11-03")).isZero();
        if (stage != FailureStage.AI_DECISION) verify(manager).rollback(any());
    }
}
