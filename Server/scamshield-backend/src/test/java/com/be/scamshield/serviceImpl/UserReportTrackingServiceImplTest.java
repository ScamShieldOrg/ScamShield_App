package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;

import com.be.scamshield.constant.VietnamProvince;

import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.ReportStatusCountsResponse;
import com.be.scamshield.dto.response.ReportSummaryMetricsResponse;
import com.be.scamshield.dto.response.TrackingReportResponse;
import com.be.scamshield.entity.*;
import com.be.scamshield.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserReportTrackingServiceImplTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private ReportEvidenceRepository reportEvidenceRepository;

    @Mock
    private ModerationActionRepository moderationActionRepository;

    @Mock
    private ScamCategorieRepository scamCategorieRepository;

    @Mock
    private ReputationRankRepository reputationRankRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Clock applicationClock;

    @InjectMocks
    private UserReportTrackingServiceImpl service;

    private final LocalDateTime fixedNow = LocalDateTime.of(2026, 10, 11, 15, 0, 0);

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        lenient().when(applicationClock.instant()).thenReturn(fixedNow.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
    }

    @Test
    void reportHistoryUsesGenericReviewerLabelWithoutDisclosingName() {
        Report report = Report.builder().id(41L).status(ReportStatus.IN_REVIEW)
                .createdAt(fixedNow).updatedAt(fixedNow).build();
        when(reportRepository.findByIdAndReporterUserId(41L, 1L)).thenReturn(Optional.of(report));
        when(moderationActionRepository.findByReportIdOrderByCreatedAtDesc(41L)).thenReturn(List.of(
                ModerationAction.builder().id(8L).action("IN_REVIEW").createdAt(fixedNow)
                        .moderatorUser(User.builder().id(99L).fullName("Private reviewer name").build()).build()));
        var detail = service.getReportDetail(1L, 41L);
        assertThat(detail.getModerationHistory()).hasSize(1);
        assertThat(detail.getSlaStatus()).isEqualTo("processing");
        assertThat(detail.getModerationHistory().getFirst().getModeratorName()).isEqualTo("Kiểm duyệt viên");
    }

    @Test
    void detailIncludesCategoryIdAndRegionForEditingWithoutDataLoss() {
        ScamCategory category = ScamCategory.builder().id(2L).name("Trúng thưởng").build();
        Indicator indicator = Indicator.builder().id(3L).type(IndicatorType.PHONE).normalizedValue("0912345678").build();
        Report report = Report.builder().id(41L).indicator(indicator).category(category).regionCode(VietnamProvince.HA_NOI)
                .status(ReportStatus.PENDING).createdAt(fixedNow).updatedAt(fixedNow).build();
        when(reportRepository.findByIdAndReporterUserId(41L, 1L)).thenReturn(Optional.of(report));
        var detail = service.getReportDetail(1L, 41L);
        assertThat(detail.getCategoryId()).isEqualTo(2L);
        assertThat(detail.getRegionCode()).isEqualTo("01");
    }

    @Test
    void withdrawalsDoNotLowerAccuracy() {
        when(reportRepository.countByReporterUserId(1L)).thenReturn(5L);
        when(reportRepository.countByReporterUserIdAndStatus(1L, ReportStatus.PENDING)).thenReturn(1L);
        when(reportRepository.countByReporterUserIdAndStatus(1L, ReportStatus.WITHDRAWN)).thenReturn(2L);
        when(reportRepository.countByReporterUserIdAndStatus(1L, ReportStatus.APPROVED)).thenReturn(2L);
        assertThat(service.getSummaryMetrics(1L).getAccuracyRate()).isEqualTo(100.0);
    }

    @Test
    void getSummaryMetricsCalculatesCorrectly() {
        Long userId = 1L;
        when(reportRepository.countByReporterUserId(userId)).thenReturn(18L);
        when(reportRepository.countByReporterUserIdAndCreatedAtAfter(eq(userId), any())).thenReturn(4L);
        when(reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.APPROVED)).thenReturn(14L);
        when(reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.PENDING)).thenReturn(3L);

        ReputationRank rank = ReputationRank.builder()
                .name("A+ Chuyên Gia")
                .minPoints(500)
                .maxPoints(700)
                .build();

        User user = User.builder()
                .id(userId)
                .reputationPoints(700)
                .reputationRank(rank)
                .build();

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        ReportSummaryMetricsResponse metrics = service.getSummaryMetrics(userId);

        assertThat(metrics.getTotalReports()).isEqualTo(18L);
        assertThat(metrics.getRecentReports7Days()).isEqualTo(4L);
        assertThat(metrics.getBlacklistedCount()).isEqualTo(14L);
        assertThat(metrics.getQueriesProtected()).isEqualTo(14L * 230L);
        assertThat(metrics.getAccuracyRate()).isEqualTo(93.3);
        assertThat(metrics.getRankTitle()).isEqualTo("A+ Chuyên Gia");
        assertThat(metrics.getReputationPoints()).isEqualTo(700);
        assertThat(metrics.getCurrentTierProgress()).isEqualTo(700);
    }

    @Test
    void getStatusCountsReturnsAccurateNumbers() {
        Long userId = 1L;
        when(reportRepository.countByReporterUserId(userId)).thenReturn(18L);
        when(reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.PENDING)).thenReturn(3L);
        when(reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.APPROVED)).thenReturn(14L);
        when(reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.REJECTED)).thenReturn(0L);

        ReportStatusCountsResponse counts = service.getStatusCounts(userId);

        assertThat(counts.getAll()).isEqualTo(18L);
        assertThat(counts.getPending()).isEqualTo(3L);
        assertThat(counts.getApprovedBlacklist()).isEqualTo(14L);
        assertThat(counts.getMergedDuplicate()).isEqualTo(0L);
        assertThat(counts.getRejected()).isEqualTo(0L);
    }

    @Test
    void getTrackingReportsMapsColumnsCorrectly() {
        Long userId = 1L;
        Indicator indicator = Indicator.builder()
                .type(IndicatorType.PHONE)
                .normalizedValue("0898421234")
                .displayValue("089.842.xxxx")
                .build();

        ScamCategory category = ScamCategory.builder()
                .id(2L)
                .name("Mạo danh cán bộ thuế/A05")
                .build();

        Report report = Report.builder()
                .id(8492L)
                .indicator(indicator)
                .category(category)
                .status(ReportStatus.APPROVED)
                .description("Đầu số MobiFone phát tán")
                .createdAt(fixedNow.minusMinutes(14))
                .updatedAt(fixedNow)
                .build();

        ReportEvidence evidence = ReportEvidence.builder()
                .id(1L)
                .report(report)
                .evidenceType(ReportEvidenceType.PNG).ocrText("Nội dung OCR")
                .build();

        when(reportRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1));

        when(reportEvidenceRepository.findByReportIdIn(List.of(8492L)))
                .thenReturn(List.of(evidence));

        when(moderationActionRepository.findByReportIdInOrderByCreatedAtDesc(List.of(8492L)))
                .thenReturn(List.of());

        PaginatedResponse<TrackingReportResponse> response = service.getTrackingReports(
                userId, null, "ALL", null, null, PageRequest.of(0, 10));

        assertThat(response.getData()).hasSize(1);
        TrackingReportResponse item = response.getData().get(0);
        assertThat(item.getId()).isEqualTo("#RPT-8492");
        assertThat(item.getTargetValue()).isEqualTo("089.842.xxxx");
        assertThat(item.getTargetType()).isEqualTo("PHONE");
        assertThat(item.getCategory()).isEqualTo("Mạo danh cán bộ thuế/A05");
        assertThat(item.getSlaTime()).isEqualTo("Xong trong 14 phút");
        assertThat(item.getSlaStatus()).isEqualTo("completed");
        assertThat(item.getEvidenceBadge()).isEqualTo("1 ảnh • OCR Pass");
        assertThat(item.getStatus()).isEqualTo("APPROVED");
    }

    @Test
    void exportCsvProducesValidCsvContentWithBom() {
        Long userId = 1L;
        Indicator indicator = Indicator.builder()
                .type(IndicatorType.PHONE)
                .displayValue("089.842.xxxx")
                .build();

        Report report = Report.builder()
                .id(8492L)
                .indicator(indicator)
                .status(ReportStatus.APPROVED)
                .createdAt(fixedNow.minusMinutes(14))
                .build();

        when(reportRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(report));

        byte[] csv = service.exportTrackingReportsCsv(userId, null, "ALL", null, null);
        String text = new String(csv, StandardCharsets.UTF_8);

        assertThat(text).startsWith("\uFEFF\"Mã báo cáo\"");
        assertThat(text).contains("#RPT-8492");
        assertThat(text).contains("089.842.xxxx");
    }

    @Test
    void exportCsvNeutralizesFormulaCharacters() {
        Long userId = 1L;
        Indicator indicator = Indicator.builder()
                .type(IndicatorType.PHONE)
                .displayValue("=1+1")
                .build();

        Report report = Report.builder()
                .id(8493L)
                .indicator(indicator)
                .status(ReportStatus.PENDING)
                .description("@SUM(A1:A5)")
                .createdAt(fixedNow.minusMinutes(10))
                .build();

        when(reportRepository.findAll(any(Specification.class)))
                .thenReturn(List.of(report));

        byte[] csv = service.exportTrackingReportsCsv(userId, null, "ALL", null, null);
        String text = new String(csv, StandardCharsets.UTF_8);

        assertThat(text).contains("\"'=1+1\"");
        assertThat(text).contains("\"'@SUM(A1:A5)\"");
    }

    @Test
    void getTrackingReportsDerivesDeterministicHashIgnoringIpAndDeviceHash() {
        Long userId = 1L;
        Indicator indicator = Indicator.builder()
                .type(IndicatorType.PHONE)
                .normalizedValue("0898421234")
                .displayValue("089.842.xxxx")
                .build();

        Report report = Report.builder()
                .id(8492L)
                .indicator(indicator)
                .status(ReportStatus.PENDING)
                .ipHash("IP_HASH_SHOULD_BE_IGNORED")
                .createdAt(fixedNow.minusMinutes(14))
                .updatedAt(fixedNow)
                .build();

        when(reportRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(report), PageRequest.of(0, 10), 1));
        when(reportEvidenceRepository.findByReportIdIn(any())).thenReturn(List.of());
        when(moderationActionRepository.findByReportIdInOrderByCreatedAtDesc(any())).thenReturn(List.of());

        PaginatedResponse<TrackingReportResponse> response = service.getTrackingReports(
                userId, null, "ALL", null, null, PageRequest.of(0, 10));

        TrackingReportResponse item = response.getData().get(0);
        assertThat(item.getHashId()).doesNotContain("IP_H");
        assertThat(item.getHashId()).doesNotContain("DEVI");
        assertThat(item.getHashId()).contains("...");
    }
}
