package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;

import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.config.ReportPrivacyProperties;
import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.dto.request.UpdateOwnReportRequest;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IUserReportTrackingService;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import com.be.scamshield.repository.ReportRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.LocalDateTime;
import java.util.List;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(showSql = false, properties = "spring.test.database.replace=none")
@Import({OwnReportService.class, ReportServiceImpl.class, ReportPrivacyProperties.class})
@ActiveProfiles("test")
class OwnReportPersistenceTest extends PostgresIntegrationTest {
    @Autowired private OwnReportService service;
    @Autowired private ReportServiceImpl submission;
    @Autowired private EntityManager em;
    @Autowired private ReportRepository reports;
    @MockitoBean private IUserReportTrackingService tracking;
    @MockitoBean private EvidenceAnalysisQueueService evidenceAnalysis;
    @MockitoBean private Clock applicationClock;
    @MockitoBean private SupabaseStorageService storage;
    @MockitoBean private ReportAssignmentService assignments;

    @Test
    void undottedSubmissionIsBlockedBySameReporterPendingDottedPhoneReport() {
        LocalDateTime now = LocalDateTime.now();
        User user = User.builder().fullName("Reporter").email("dotted-report@example.test")
                .phoneNumber("0912345698").passwordHash("test").status("ACTIVE").build();
        em.persist(user);
        Indicator indicator = Indicator.builder().type(IndicatorType.PHONE).normalizedValue("098.765.4321")
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        Report report = Report.builder().reporterUser(user).indicator(indicator).status(ReportStatus.PENDING)
                .createdAt(now).updatedAt(now).build();
        em.persist(report);
        em.flush();
        em.clear();

        var request = CreateReportRequest.builder().threatType("PHONE").targetIdentifier("0987654321")
                .regionCode("01").category("OTHER").description("Nội dung báo cáo").isConfirmed(true).build();
        var evidence = new MockMultipartFile("files", "proof.png", "image/png", new byte[]{1});
        var principal = UserPrincipal.builder().id(user.getId()).build();
        assertThatThrownBy(() -> submission.createReport(request, List.of(evidence), principal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bạn đã có báo cáo");
        verifyNoInteractions(storage);
    }

    @Test
    void realLockQueryAllowsOwnerUpdateAndSoftWithdrawalWithAudit() {
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-01T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        LocalDateTime now = LocalDateTime.now(applicationClock);
        User user = User.builder().fullName("Reporter").email("own-report@example.test")
                .phoneNumber("0912345698").passwordHash("test").status("ACTIVE").build();
        em.persist(user);
        Indicator indicator = Indicator.builder().type(IndicatorType.PHONE).normalizedValue("0912345690")
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        Report report = Report.builder().reporterUser(user).indicator(indicator).status(ReportStatus.PENDING)
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
        assertThat(em.find(Report.class, id).getStatus()).isEqualTo(ReportStatus.WITHDRAWN);
        assertThat(em.createQuery("select count(a) from AuditLog a where a.entityType = 'REPORT' and a.entityId = :id", Long.class)
                .setParameter("id", id).getSingleResult()).isEqualTo(2L);
    }

    @Test
    void reviewCountIncludesOnlyStartedPendingReportsWithoutDoubleCounting() {
        LocalDateTime now = LocalDateTime.of(2026, 11, 4, 10, 0);
        User moderator = User.builder().fullName("Moderator").email("review-count@example.test").phoneNumber("0912345682")
                .passwordHash("test").status("ACTIVE").build();
        em.persist(moderator);
        long baseline = reports.countStartedReviewsByStatus(ReportStatus.PENDING);
        Indicator indicator = Indicator.builder().type(IndicatorType.PHONE).normalizedValue("0912345691")
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        Report pending = Report.builder().reporterUser(moderator).indicator(indicator).status(ReportStatus.PENDING)
                .createdAt(now).updatedAt(now).build();
        em.persist(pending);
        em.flush();
        assertThat(reports.countStartedReviewsByStatus(ReportStatus.PENDING)).isEqualTo(baseline);
        for (int i = 0; i < 2; i++) {
            em.persist(ModerationAction.builder().report(pending).moderatorUser(moderator)
                    .action("IN_REVIEW").reason("Bắt đầu duyệt").createdAt(now).build());
        }
        em.flush();
        assertThat(reports.countStartedReviewsByStatus(ReportStatus.PENDING)).isEqualTo(baseline + 1);
        for (ReportStatus status : new ReportStatus[]{ReportStatus.APPROVED, ReportStatus.REJECTED, ReportStatus.WITHDRAWN}) {
            pending.setStatus(status);
            em.flush();
            assertThat(reports.countStartedReviewsByStatus(ReportStatus.PENDING)).isEqualTo(baseline);
        }
    }
}
