package com.be.scamshield.repository;

import com.be.scamshield.serviceImpl.EvidenceComparisonService;
import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.ConfirmedIndicatorStatus;
import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.entity.*;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.serviceImpl.ReportAssignmentService;
import com.be.scamshield.serviceImpl.ModeratorReportServiceImpl;
import com.be.scamshield.support.PostgresIntegrationTest;
import com.be.scamshield.util.ModeratorReportScope;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
@Import({ReportAssignmentService.class, ModeratorReportServiceImpl.class, EvidenceComparisonService.class, EvidenceAnalysisProperties.class})
class ReportAssignmentPersistenceTest extends PostgresIntegrationTest {
    @Autowired EntityManager em;
    @Autowired ReportAssignmentService service;
    @Autowired ReportRepository reports;
    @Autowired ModeratorReportServiceImpl moderatorReports;
    @Autowired ModerationActionRepository moderation;
    @Autowired ResourceRepository resources;
    @MockitoBean SupabaseStorageService storage;

    @Test
    void imageIsDiscoverableOnlyForTheCurrentApprovedReportOfAnActiveBlacklistEntry() throws Exception {
        Role role = Role.builder().name("MODERATOR").build();
        em.persist(role);
        User moderator = user("publisher", "0911234501", role);
        User reporter = user("reporter", "0911234502", role);
        LocalDateTime now = LocalDateTime.now();
        Indicator indicator = Indicator.builder().type(IndicatorType.URL).normalizedValue("image.example.test")
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        Report report = Report.builder().reporterUser(reporter).assignedModerator(moderator).indicator(indicator)
                .status(ReportStatus.IN_REVIEW).createdAt(now).updatedAt(now).build();
        em.persist(report);
        ReportEvidence evidence = ReportEvidence.builder().report(report).evidenceType(ReportEvidenceType.PNG)
                .createdAt(now).build();
        em.persist(evidence);
        ReportEvidence secondEvidence = ReportEvidence.builder().report(report).evidenceType(ReportEvidenceType.PNG)
                .createdAt(now).build();
        em.persist(secondEvidence);

        var principal = UserPrincipal.builder().id(moderator.getId()).role("MODERATOR").build();
        var request = ModeratorDecisionRequest.builder().decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Ghi chú nội bộ").build();
        var bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), "png", bytes);
        var image = new MockMultipartFile("publicImage", "proof.png", "image/png", bytes.toByteArray());
        String key = "published-reports/redacted.jpg";
        String secondKey = "published-reports/redacted-2.jpg";
        when(storage.storeReportPublicationImage(any(byte[].class))).thenReturn(key, secondKey);

        moderatorReports.makeDecision(report.getId(), principal, request,
                List.of(evidence.getId(), secondEvidence.getId()), List.of(image, image));
        em.flush();
        var entry = resources.findAll().getFirst();
        assertThat(entry.getPublicReason()).doesNotContain(request.getReason());
        assertThat(resources.findBlackListImageKey(entry.getId())).contains(key);
        assertThat(resources.findBlackListImageKeys(entry.getId())).containsExactly(key, secondKey);
        assertThat(resources.findBlackListResources(null, null, PageRequest.of(0, 5)).getContent())
                .singleElement().satisfies(row -> assertThat(row.getPublicImageCount()).isEqualTo(2));

        String firstUrl = "https://storage.example/published-first";
        String secondUrl = "https://storage.example/published-second";
        when(storage.createReportPublicationImageUrl(key)).thenReturn(firstUrl);
        when(storage.createReportPublicationImageUrl(secondKey)).thenReturn(secondUrl);
        assertThat(moderatorReports.getReportById(report.getId(), principal).getEvidences())
                .hasSize(2).allMatch(item -> item.isHasPublishedImage());
        assertThat(moderatorReports.getPublishedEvidenceImage(report.getId(), evidence.getId(), principal))
                .isEqualTo(firstUrl);
        assertThat(moderatorReports.getPublishedEvidenceImage(report.getId(), secondEvidence.getId(), principal))
                .isEqualTo(secondUrl);

        entry.setStatus(ConfirmedIndicatorStatus.RETRACTED);
        em.flush();
        assertThat(resources.findBlackListImageKeys(entry.getId())).isEmpty();
    }

    @Test
    void assignmentsAreStoredOnReportAndSharedQueueStillIncludesOtherModeratorsReports() {
        Role role = Role.builder().name("MODERATOR").build();
        em.persist(role);
        User first = user("first", "0901234501", role);
        User second = user("second", "0901234502", role);
        LocalDateTime now = LocalDateTime.now();
        Indicator indicator = Indicator.builder().type(IndicatorType.URL).normalizedValue("assignment.example")
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        Report existing = Report.builder().reporterUser(first).assignedModerator(first).indicator(indicator)
                .status(ReportStatus.PENDING).createdAt(now).updatedAt(now).build();
        Report waiting = Report.builder().reporterUser(first).indicator(indicator)
                .status(ReportStatus.PENDING).createdAt(now).updatedAt(now).build();
        em.persist(existing);
        em.persist(waiting);
        em.flush();
        service.assignPendingReports();
        em.flush();
        em.clear();
        assertThat(reports.findById(existing.getId()).orElseThrow().getAssignedModerator().getId()).isEqualTo(first.getId());
        assertThat(reports.findById(waiting.getId()).orElseThrow().getAssignedModerator().getId()).isEqualTo(second.getId());
        var scope = ModeratorReportScope.visibleTo(UserPrincipal.builder().id(first.getId()).role("MODERATOR").build());
        assertThat(reports.findAll(scope, PageRequest.of(0, 20)).getTotalElements()).isEqualTo(2);
        service.assignPendingReports();
        assertThat(reports.findById(waiting.getId()).orElseThrow().getAssignedModerator().getId()).isEqualTo(second.getId());
        Report stale = reports.findById(existing.getId()).orElseThrow();
        em.createNativeQuery("update reports set description = 'Updated by reporter' where id = :id")
                .setParameter("id", existing.getId()).executeUpdate();
        stale.setAssignedModerator(second);
        em.flush();
        em.clear();
        assertThat(reports.findById(existing.getId()).orElseThrow().getDescription()).isEqualTo("Updated by reporter");
        UserPrincipal reviewer = UserPrincipal.builder().id(second.getId()).role("MODERATOR").build();
        moderatorReports.startReview(waiting.getId(), reviewer);
        em.flush();
        em.clear();
        moderatorReports.startReview(waiting.getId(), reviewer);
        em.flush();
        assertThat(reports.findById(waiting.getId()).orElseThrow().getStatus()).isEqualTo(ReportStatus.IN_REVIEW);
        assertThat(moderation.findByReportIdOrderByCreatedAtDesc(waiting.getId()))
                .extracting(ModerationAction::getAction).containsExactly("IN_REVIEW");
    }

    private User user(String name, String phone, Role role) {
        User user = User.builder().fullName(name).email(name + "@assignment.test").phoneNumber(phone)
                .passwordHash("test").status("ACTIVE").role(role).build();
        em.persist(user);
        return user;
    }
}
