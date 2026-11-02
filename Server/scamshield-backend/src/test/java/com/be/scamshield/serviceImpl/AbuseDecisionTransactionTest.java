package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.AbuseEscalationDecision;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.repository.AbuseFlagRepository;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAdminAbuseEscalationService;
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
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;

@DataJpaTest(showSql = false, properties = {
        "spring.test.database.replace=none",
        "spring.datasource.url=jdbc:h2:mem:abuse-decision-tx;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000"
})
@Import(AdminAbuseEscalationServiceImpl.class)
@ActiveProfiles("test")
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class AbuseDecisionTransactionTest {
    @Autowired private IAdminAbuseEscalationService service;
    @Autowired private EntityManager em;
    @Autowired private PlatformTransactionManager manager;
    @Autowired private UserRepository users;
    @Autowired private AbuseFlagRepository flags;
    @MockitoSpyBean private AuditLogRepository audits;
    @MockitoBean private Clock applicationClock;
    private static final AtomicInteger SEQUENCE = new AtomicInteger(20000000);
    private Long targetId;
    private Long flagId;
    private UserPrincipal principal;

    @BeforeEach
    void setup() {
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-10-29T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        new TransactionTemplate(manager).executeWithoutResult(tx -> {
            Role role = em.createQuery("select r from Role r where r.name = 'ADMINISTRATOR'", Role.class)
                    .getResultStream().findFirst().orElseGet(() -> {
                        Role created = Role.builder().name("ADMINISTRATOR").build();
                        em.persist(created);
                        return created;
                    });
            User admin = account(role);
            principal = UserPrincipal.create(admin);
            User target = account(null);
            targetId = target.getId();
            AbuseFlag flag = AbuseFlag.builder().user(target).status("PENDING").flagType("BULK_REPORTING")
                    .severity("MEDIUM").createdAt(LocalDateTime.now(applicationClock)).build();
            em.persist(flag);
            flagId = flag.getId();
        });
    }

    private User account(Role role) {
        String key = String.valueOf(SEQUENCE.incrementAndGet());
        User user = User.builder().fullName("Transaction test").email(key + "@example.test")
                .phoneNumber("09" + key).passwordHash("test-hash").role(role).status("ACTIVE").build();
        em.persist(user);
        return user;
    }

    private DecideAbuseEscalationRequest request() {
        return new DecideAbuseEscalationRequest(AbuseEscalationDecision.BAN, "Đã xác minh đầy đủ bằng chứng lạm dụng tài khoản.");
    }

    @Test
    void auditFailureRollsBackBothUserAndCase() {
        doThrow(new IllegalStateException("Audit unavailable")).when(audits).save(argThat((AuditLog audit) -> audit != null && "USER".equals(audit.getEntityType())));
        assertThatThrownBy(() -> service.decideEscalation(flagId, request(), principal)).isInstanceOf(IllegalStateException.class);
        assertThat(flags.findById(flagId).orElseThrow().getStatus()).isEqualTo("PENDING");
        assertThat(users.findById(targetId).orElseThrow().getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    void concurrentDecisionsProduceExactlyOneDecisionAndUserAudit() throws Exception {
        CountDownLatch start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var task = (Callable<String>) () -> {
                if (!start.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Start timeout");
                try {
                    service.decideEscalation(flagId, request(), principal);
                    return "DECIDED";
                } catch (AbuseEscalationConflictException exception) {
                    return "CONFLICT";
                }
            };
            var first = pool.submit(task);
            var second = pool.submit(task);
            start.countDown();
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("DECIDED", "CONFLICT");
        }
        assertThat(flags.findById(flagId).orElseThrow().getStatus()).isEqualTo("OPEN");
        assertThat(users.findById(targetId).orElseThrow().getStatus()).isEqualTo("BANNED");
        assertThat(audits.findByEntityTypeAndEntityIdOrderByCreatedAtDescIdDesc("ABUSE_FLAG", flagId)).hasSize(1);
        assertThat(audits.findByEntityTypeAndEntityIdOrderByCreatedAtDescIdDesc("USER", targetId)).hasSize(1);
    }
}
