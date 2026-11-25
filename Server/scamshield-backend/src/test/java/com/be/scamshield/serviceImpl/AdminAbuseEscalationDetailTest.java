
package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.*;
import com.be.scamshield.repository.*;
import com.be.scamshield.exception.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

@ExtendWith(MockitoExtension.class)
class AdminAbuseEscalationDetailTest {
    @Mock AbuseFlagRepository flags;
    @Mock UserRepository users;
    @Mock ReportRepository reports;
    @Mock ReportEvidenceRepository evidence;
    @Mock ModerationActionRepository actions;
    @Mock AuditLogRepository audits;
    private AdminAbuseEscalationServiceImpl service;
    private User target;
    private AbuseFlag flag;
    private final LocalDateTime end = LocalDateTime.of(2026, 11, 24, 12, 0);

    @BeforeEach void setup() {
        service = new AdminAbuseEscalationServiceImpl(flags, users, Clock.systemUTC(),
                reports, evidence, actions, audits);
        target = User.builder().id(7L).fullName("Target").email("qa@example.test")
                .phoneNumber("0900000001").status("ACTIVE").reputationPoints(50)
                .isPhoneVerified(true).createdAt(end.minusDays(30)).build();
        flag = AbuseFlag.builder().id(41L).user(target).status("PENDING")
                .relatedReports(new ArrayList<>()).createdAt(end).build();
    }
    private void found() {
        when(flags.findByIdAndUserIsNotNullAndStatusIn(eq(41L), anyList())).thenReturn(Optional.of(flag));
        when(reports.getAbuseReportActivity(7L, end.minusHours(24), end)).thenReturn(
                new ReportRepository.AbuseReportActivity() {
                    public long getTotalReports() { return 0; }
                    public long getRejectedReports() { return 0; }
                    public long getDistinctIndicators() { return 0; }
                });
    }
    private Report report(long id, User owner) {
        return Report.builder().id(id).reporterUser(owner).createdAt(end).build();
    }
    private void absent(long id) {
        when(flags.findByIdAndUserIsNotNullAndStatusIn(eq(id), anyList())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getEscalationById(id)).isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy hồ sơ lạm dụng");
        verifyNoInteractions(reports, evidence, actions, audits);
    }
    @Test void utcid01_nullId() {
        assertThatThrownBy(() -> service.getEscalationById(null)).isInstanceOf(BadRequestException.class)
                .hasMessage("ID hồ sơ phải là số nguyên dương");
        verifyNoInteractions(flags, reports, evidence, actions, audits);
    }
    @Test void utcid02_zeroId() {
        assertThatThrownBy(() -> service.getEscalationById(0L)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(flags);
    }
    @Test void utcid03_negativeId() {
        assertThatThrownBy(() -> service.getEscalationById(-1L)).isInstanceOf(BadRequestException.class);
        verifyNoInteractions(flags);
    }
    @Test void utcid04_missingCase() { absent(41L); }
    @Test void utcid05_pendingDetail() {
        found();
        var result = service.getEscalationById(41L);
        assertThat(result.getEscalation().getStatus().name()).isEqualTo("PENDING");
        assertThat(result.getAccountDetails().getPhoneNumber()).isEqualTo("0900000001");
        assertThat(result.getAccountDetails().getReputationPoints()).isEqualTo(50);
    }
    @Test void utcid06_openDetail() {
        found(); flag.setStatus("OPEN");
        assertThat(service.getEscalationById(41L).getEscalation().getStatus().name()).isEqualTo("OPEN");
    }
    @Test void utcid07_dismissedDetail() {
        found(); flag.setStatus("DISMISSED");
        assertThat(service.getEscalationById(41L).getEscalation().getStatus().name()).isEqualTo("DISMISSED");
    }
    @Test void utcid08_legacyStatusExcludedByRepositoryContract() { absent(41L); }
    @Test void utcid09_noAccountExcludedByRepositoryContract() { absent(41L); }
    @Test void utcid10_deduplicateAndSortReports() {
        found();
        Report a = report(10, target), b = report(11, target);
        flag.setReport(a); flag.setRelatedReports(List.of(b, a));
        var result = service.getEscalationById(41L);
        assertThat(result.getEscalation().getReportIds()).containsExactly(10L, 11L);
        assertThat(result.getReports()).extracting(x -> x.getId()).containsExactly(10L, 11L);
    }
    @Test void utcid11_foreignReportsExcluded() {
        found();
        flag.setRelatedReports(List.of(report(12, User.builder().id(99L).build())));
        var result = service.getEscalationById(41L);
        assertThat(result.getReports()).isEmpty();
        assertThat(result.getEscalation().getReportIds()).isEmpty();
        verifyNoInteractions(evidence, actions);
    }
    @Test void utcid12_emptyCollectionsAndScopedAudit() {
        found();
        var result = service.getEscalationById(41L);
        assertThat(result.getReports()).isEmpty(); assertThat(result.getAuditTrail()).isEmpty();
        verifyNoInteractions(evidence, actions);
        verify(audits).findByEntityTypeAndEntityIdOrderByCreatedAtDescIdDesc("ABUSE_FLAG", 41L);
    }
    @Test void utcid13_latestModerationAndEvidence() {
        found();
        Report r = report(10, target); flag.setRelatedReports(List.of(r));
        when(actions.findByReportIdInOrderByCreatedAtDescIdDesc(List.of(10L))).thenReturn(List.of(
                ModerationAction.builder().id(2L).report(r).action("REJECT").createdAt(end).build(),
                ModerationAction.builder().id(1L).report(r).action("IN_REVIEW").createdAt(end.minusHours(1)).build()));
        when(evidence.findByReportIdInOrderByCreatedAtAscIdAsc(List.of(10L))).thenReturn(List.of(
                ReportEvidence.builder().id(5L).report(r).fileName("proof.png").build()));
        var item = service.getEscalationById(41L).getReports().getFirst();
        assertThat(item.getLatestModeration().getId()).isEqualTo(2L);
        assertThat(item.getEvidences()).extracting(x -> x.getFileName()).containsExactly("proof.png");
    }
    @Test void utcid14_zeroActivity() {
        found();
        var activity = service.getEscalationById(41L).getActivity();
        assertThat(activity.getTotalReports()).isZero();
        assertThat(activity.getRejectedPercentage()).isNull();
    }
    @Test void utcid15_activityWindowAndRounding() {
        found();
        when(reports.getAbuseReportActivity(7L, end.minusHours(24), end)).thenReturn(
                new ReportRepository.AbuseReportActivity() {
                    public long getTotalReports() { return 3; }
                    public long getRejectedReports() { return 1; }
                    public long getDistinctIndicators() { return 2; }
                });
        var result = service.getEscalationById(41L).getActivity();
        assertThat(result.getWindowStart()).isEqualTo(end.minusHours(24));
        assertThat(result.getWindowEnd()).isEqualTo(end);
        assertThat(result.getRejectedPercentage()).isEqualByComparingTo("33.33");
        assertThat(result.getDistinctIndicators()).isEqualTo(2);
    }
}
