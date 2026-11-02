package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.UpdateOwnReportRequest;
import com.be.scamshield.entity.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IUserReportTrackingService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.LocalDateTime;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(showSql = false, properties = {"spring.test.database.replace=none",
        "spring.datasource.url=jdbc:h2:mem:own-report-write;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"})
@Import(OwnReportService.class)
@ActiveProfiles("test")
class OwnReportPersistenceTest {
    @Autowired private OwnReportService service;
    @Autowired private EntityManager em;
    @MockitoBean private IUserReportTrackingService tracking;
    @MockitoBean private Clock applicationClock;

    @Test
    void realLockQueryAllowsOwnerUpdateAndSoftWithdrawalWithAudit() {
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-01T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime now = LocalDateTime.now(applicationClock);
        User user = User.builder().fullName("Reporter").email("own-report@example.test")
                .phoneNumber("0912345698").passwordHash("test").status("ACTIVE").build();
        em.persist(user);
        Indicator indicator = Indicator.builder().type("PHONE").normalizedValue("0912345690")
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        Report report = Report.builder().reporterUser(user).indicator(indicator).status("PENDING")
                .createdAt(now).updatedAt(now).build();
        em.persist(report);
        em.flush();
        Long id = report.getId();
        Long userId = user.getId();
        em.clear();
        UserPrincipal principal = UserPrincipal.builder().id(userId).build();
        service.update(id, UpdateOwnReportRequest.builder().description("Bổ sung nội dung báo cáo").build(), principal);
        service.withdraw(id, principal);
        em.flush();
        em.clear();
        assertThat(em.find(Report.class, id).getStatus()).isEqualTo("WITHDRAWN");
        assertThat(em.createQuery("select count(a) from AuditLog a where a.entityType = 'REPORT' and a.entityId = :id", Long.class)
                .setParameter("id", id).getSingleResult()).isEqualTo(2L);
    }
}
