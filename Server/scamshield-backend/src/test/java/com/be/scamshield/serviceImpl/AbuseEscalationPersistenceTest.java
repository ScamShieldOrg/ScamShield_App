package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.constant.AbuseFlagType;
import com.be.scamshield.dto.request.CreateAbuseEscalationRequest;
import com.be.scamshield.dto.request.ModeratorAbuseEscalationFilterRequest;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.repository.AbuseFlagRepository;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorAbuseEscalationService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@DataJpaTest(showSql = false, properties = {
        "spring.test.database.replace=none",
        "spring.datasource.url=jdbc:h2:mem:abuse-escalation-write-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000",
        "spring.jpa.properties.hibernate.hbm2ddl.halt_on_error=true"
})
@Import(ModeratorAbuseEscalationServiceImpl.class)
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AbuseEscalationPersistenceTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 28, 9, 0);
    private static final AtomicInteger SEQUENCE = new AtomicInteger(10000000);

    @Autowired private IModeratorAbuseEscalationService service;
    @Autowired private EntityManager entityManager;
    @Autowired private UserRepository userRepository;
    @Autowired private AbuseFlagRepository flagRepository;
    @Autowired private PlatformTransactionManager transactionManager;
    @MockitoSpyBean private AuditLogRepository auditLogRepository;
    @MockitoBean private Clock applicationClock;

    private TransactionTemplate transaction;
    private Fixture fixture;

    @BeforeEach
    void setUp() {
        transaction = new TransactionTemplate(transactionManager);
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-10-28T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        fixture = transaction.execute(status -> {
            Role role = entityManager.createQuery("select r from Role r where r.name = 'MODERATOR'", Role.class)
                    .getResultStream().findFirst().orElseGet(() -> {
                        Role created = Role.builder().name("MODERATOR").build();
                        entityManager.persist(created);
                        return created;
                    });
            User moderator = account(role);
            User target = account(null);
            User other = account(null);
            Report first = report(target);
            Report second = report(target);
            Report foreign = report(other);
            entityManager.flush();
            return new Fixture(target.getId(), moderator.getId(), List.of(first.getId(), second.getId()), foreign.getId());
        });
    }

    @Test
    void persistsCreatorMultipleReportsLongNotesAndAuditAndReadsThemBack() {
        CreateAbuseEscalationRequest request = request();
        request.setReason("Lý do xác minh hành vi lạm dụng. ".repeat(30));
        request.setEvidence("Bằng chứng gửi báo cáo hàng loạt. ".repeat(100));
        var created = service.createEscalation(fixture.targetId(), request, principal());

        assertThat(created.getStatus()).isEqualTo(AbuseFlagStatus.PENDING);
        assertThat(created.getCreatedAt()).isEqualTo(NOW);
        assertThat(created.getReportIds()).containsExactlyElementsOf(fixture.reportIds());
        assertThat(created.getCreatedByUserId()).isEqualTo(fixture.moderatorId());
        assertThat(userRepository.findById(fixture.targetId()).orElseThrow().getStatus()).isEqualTo("ACTIVE");
        assertThat(flagRepository.existsByUserIdAndStatus(fixture.targetId(), "OPEN")).isFalse();

        var history = service.getEscalations(fixture.targetId(), new ModeratorAbuseEscalationFilterRequest());
        assertThat(history.getTotalItems()).isEqualTo(1);
        assertThat(history.getData()).singleElement().satisfies(item -> {
            assertThat(item.getReportIds()).containsExactlyElementsOf(fixture.reportIds());
            assertThat(item.getCreatedByUserId()).isEqualTo(fixture.moderatorId());
            assertThat(item.getReason()).isEqualTo(request.getReason().strip());
            assertThat(item.getEvidence()).isEqualTo(request.getEvidence().strip());
        });
        transaction.executeWithoutResult(status -> {
            var audit = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("ABUSE_FLAG", created.getId());
            assertThat(audit).singleElement().satisfies(log -> {
                assertThat(log.getActorUser().getId()).isEqualTo(fixture.moderatorId());
                assertThat(log.getAction()).isEqualTo("CREATE_ABUSE_ESCALATION");
                assertThat(log.getNewValue()).isEqualTo("PENDING");
                assertThat(log.getReason()).isEqualTo(request.getReason().strip());
            });
        });
    }

    @Test
    void foreignReportsAreRejectedWithoutCreatingFlagOrLinks() {
        CreateAbuseEscalationRequest request = request();
        request.setReportIds(List.of(fixture.reportIds().getFirst(), fixture.foreignReportId()));
        assertThatThrownBy(() -> service.createEscalation(fixture.targetId(), request, principal()))
                .isInstanceOf(BadRequestException.class);
        assertThat(flagRepository.findByUserIdOrderByCreatedAtDesc(fixture.targetId())).isEmpty();
    }

    @Test
    void auditFailureRollsBackFlagAndReportLinks() {
        doThrow(new IllegalStateException("Audit storage unavailable"))
                .when(auditLogRepository).save(any(AuditLog.class));
        assertThatThrownBy(() -> service.createEscalation(fixture.targetId(), request(), principal()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(flagRepository.findByUserIdOrderByCreatedAtDesc(fixture.targetId())).isEmpty();
        Number links = transaction.execute(status -> (Number) entityManager.createNativeQuery(
                        "select count(*) from abuse_flag_reports where report_id = :reportId")
                .setParameter("reportId", fixture.reportIds().getFirst()).getSingleResult());
        assertThat(links.longValue()).isZero();
    }

    @Test
    void simultaneousSubmissionsCreateExactlyOnePendingCaseAndOneAudit() throws Exception {
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        List<String> outcomes = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Future<String>> attempts = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                attempts.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(5, TimeUnit.SECONDS)) {
                        throw new IllegalStateException("Concurrent submission did not start");
                    }
                    try {
                        service.createEscalation(fixture.targetId(), request(), principal());
                        return "CREATED";
                    } catch (AbuseEscalationConflictException ex) {
                        return "CONFLICT";
                    }
                }));
            }
            assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            for (Future<String> attempt : attempts) {
                outcomes.add(attempt.get(15, TimeUnit.SECONDS));
            }
        }
        assertThat(outcomes).containsExactlyInAnyOrder("CREATED", "CONFLICT");
        List<AbuseFlag> flags = flagRepository.findByUserIdAndStatus(fixture.targetId(), "PENDING");
        assertThat(flags).hasSize(1);
        assertThat(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("ABUSE_FLAG", flags.getFirst().getId()))
                .hasSize(1);
    }

    @Test
    void existingOpenFlagDoesNotBlockNewPendingCaseAndLegacyReportStillAppears() {
        transaction.executeWithoutResult(status -> {
            AbuseFlag legacy = AbuseFlag.builder().user(entityManager.getReference(User.class, fixture.targetId()))
                    .report(entityManager.getReference(Report.class, fixture.reportIds().getFirst()))
                    .flagType("MASS_REPORTS").severity("HIGH").status("OPEN").createdAt(NOW.minusDays(1)).build();
            entityManager.persist(legacy);
        });
        service.createEscalation(fixture.targetId(), request(), principal());
        ModeratorAbuseEscalationFilterRequest filter = new ModeratorAbuseEscalationFilterRequest();
        filter.setSize(1);
        var first = service.getEscalations(fixture.targetId(), filter);
        assertThat(first.getTotalItems()).isEqualTo(2);
        assertThat(first.getData()).singleElement().satisfies(item ->
                assertThat(item.getReportIds()).containsExactlyElementsOf(fixture.reportIds()));
        filter.setPage(1);
        var legacy = service.getEscalations(fixture.targetId(), filter).getData().getFirst();
        assertThat(legacy.getReportIds()).containsExactly(fixture.reportIds().getFirst());
        assertThat(legacy.getCreatedByUserId()).isNull();
    }

    private User account(Role role) {
        String suffix = Integer.toString(SEQUENCE.incrementAndGet());
        User user = User.builder().fullName("Tài khoản " + suffix).email(suffix + "@example.test")
                .phoneNumber("09" + suffix).passwordHash("test-hash").status("ACTIVE")
                .role(role).reputationPoints(0).build();
        entityManager.persist(user);
        return user;
    }

    private Report report(User reporter) {
        Indicator indicator = Indicator.builder().type("PHONE").normalizedValue(reporter.getPhoneNumber())
                .createdAt(NOW).updatedAt(NOW).firstSeenAt(NOW).lastSeenAt(NOW).build();
        entityManager.persist(indicator);
        Report report = Report.builder().reporterUser(reporter).indicator(indicator).status("REJECTED")
                .reportCountSignal(1).coordinatedReportSuspected(false).moderationLocked(false)
                .createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(report);
        return report;
    }

    private UserPrincipal principal() {
        return UserPrincipal.builder().id(fixture.moderatorId()).build();
    }

    private CreateAbuseEscalationRequest request() {
        return CreateAbuseEscalationRequest.builder().flagType(AbuseFlagType.BULK_REPORTING)
                .reason("Tài khoản gửi nhiều báo cáo thiếu căn cứ").reportIds(fixture.reportIds()).build();
    }

    private record Fixture(Long targetId, Long moderatorId, List<Long> reportIds, Long foreignReportId) { }
}
