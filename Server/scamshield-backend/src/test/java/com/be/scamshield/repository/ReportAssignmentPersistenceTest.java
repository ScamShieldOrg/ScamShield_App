package com.be.scamshield.repository;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.entity.*;
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
import org.springframework.test.context.ActiveProfiles;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.*;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
@Import({ReportAssignmentService.class, ModeratorReportServiceImpl.class})
class ReportAssignmentPersistenceTest extends PostgresIntegrationTest {
    @Autowired EntityManager em;
    @Autowired ReportAssignmentService service;
    @Autowired ReportRepository reports;
    @Autowired ModeratorReportServiceImpl moderatorReports;
    @Autowired ModerationActionRepository moderation;

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
