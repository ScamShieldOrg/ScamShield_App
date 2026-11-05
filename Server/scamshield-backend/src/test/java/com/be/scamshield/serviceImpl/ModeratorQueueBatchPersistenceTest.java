package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.entity.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(showSql = false, properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ActiveProfiles("test")
@Import(ModeratorReportServiceImpl.class)
class ModeratorQueueBatchPersistenceTest extends PostgresIntegrationTest {
    @Autowired EntityManager em;
    @Autowired ModeratorReportServiceImpl service;
    @MockitoBean ReportAssignmentService assignments;

    @Test
    void queueUsesConstantQueryCountAndMatchesSingleReportDuplicateDetails() {
        LocalDateTime now = LocalDateTime.now().minusHours(1);
        User moderator = user(1000);
        User firstReporter = user(0);
        User differentReporter = user(1001);
        Indicator archiveIndicator = indicator("archive.example", now);
        Report sameReporterArchive = report(firstReporter, moderator, archiveIndicator, ReportStatus.REJECTED, now);
        Report otherReporterArchive = report(differentReporter, moderator, archiveIndicator, ReportStatus.REJECTED, now);
        // Put the queue evidence after the first 21 matches to verify exclusion and the 20-row limit.
        for (int index = 0; index < 26; index++) {
            evidence(index % 2 == 0 ? sameReporterArchive : otherReporterArchive, "hash-0", now);
        }
        for (int index = 0; index < 20; index++) {
            Indicator indicator = indicator("queue-" + index + ".example", now);
            Report report = report(index == 0 ? firstReporter : user(index), moderator, indicator, ReportStatus.IN_REVIEW, now);
            evidence(report, "hash-" + index, now);
            PartnerProfile partner = PartnerProfile.builder().user(user(100 + index)).legalName("Partner " + index)
                    .brandName("Brand " + index).verificationStatus(PartnerVerificationStatus.VERIFIED)
                    .verifiedAt(now).createdAt(now).build();
            em.persist(partner);
            em.persist(WhitelistEntry.builder().partner(partner).indicator(indicator).verificationStatus("VERIFIED")
                    .autoLockModeration(false).verifiedAt(now).createdAt(now).build());
        }
        em.flush();
        em.clear();
        UserPrincipal viewer = UserPrincipal.builder().id(moderator.getId()).role("MODERATOR").build();
        ModeratorReportFilterRequest filter = ModeratorReportFilterRequest.builder().tab("IN_REVIEW").build();
        Statistics statistics = em.getEntityManagerFactory().unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        var small = service.getReportQueue(filter, PageRequest.of(0, 1, Sort.by("id")), viewer);
        long smallQueries = statistics.getPrepareStatementCount();
        assertThat(small.getData()).hasSize(1);
        em.clear();
        statistics.clear();
        var large = service.getReportQueue(filter, PageRequest.of(0, 20, Sort.by("id")), viewer);
        long largeQueries = statistics.getPrepareStatementCount();
        assertThat(large.getData()).hasSize(20);
        assertThat(largeQueries).isEqualTo(smallQueries).isLessThanOrEqualTo(6);
        assertThat(large.getData()).allSatisfy(item -> {
            assertThat(item.isWhitelisted()).isTrue();
            assertThat(item.getWhitelistMatches()).hasSize(1);
        });
        var first = large.getData().getFirst();
        var duplicates = first.getEvidences().getFirst();
        assertThat(duplicates.getDuplicateCount()).isEqualTo(26);
        assertThat(duplicates.getDuplicates()).hasSize(20);
        assertThat(duplicates.getDuplicates()).extracting(item -> item.sameReporter()).contains(true, false);
        assertThat(duplicates.getDuplicates()).extracting(item -> item.evidenceId()).doesNotContain(duplicates.getRawId());
        em.clear();
        var detail = service.getReportById(first.getRawId(), viewer);
        assertThat(first).usingRecursiveComparison().isEqualTo(detail);
    }

    private User user(int index) {
        User user = User.builder().fullName("User " + index).email("batch-" + index + "@example.test")
                .phoneNumber(String.format("09%08d", index)).passwordHash("test").status("ACTIVE").build();
        em.persist(user);
        return user;
    }

    private Indicator indicator(String value, LocalDateTime now) {
        Indicator indicator = Indicator.builder().type(IndicatorType.URL).normalizedValue(value).displayValue(value)
                .createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        return indicator;
    }

    private Report report(User reporter, User moderator, Indicator indicator, ReportStatus status, LocalDateTime now) {
        Report report = Report.builder().reporterUser(reporter).assignedModerator(moderator).indicator(indicator)
                .status(status).createdAt(now).updatedAt(now).build();
        em.persist(report);
        return report;
    }

    private void evidence(Report report, String hash, LocalDateTime now) {
        em.persist(ReportEvidence.builder().report(report).evidenceType(ReportEvidenceType.PNG).fileHash(hash)
                .fileName(hash + ".png").fileUrl("https://files.example/" + hash + ".png").createdAt(now).build());
    }
}
