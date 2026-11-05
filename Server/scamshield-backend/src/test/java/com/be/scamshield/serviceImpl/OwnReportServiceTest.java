package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.VietnamProvince;

import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.dto.request.UpdateOwnReportRequest;
import com.be.scamshield.entity.*;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IUserReportTrackingService;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.*;

class OwnReportServiceTest {
    private final ReportRepository reports = mock(ReportRepository.class);
    private final IndicatorRepository indicators = mock(IndicatorRepository.class);
    private final ReportEvidenceRepository evidence = mock(ReportEvidenceRepository.class);
    private final ModerationActionRepository moderation = mock(ModerationActionRepository.class);
    private final ScamCategorieRepository categories = mock(ScamCategorieRepository.class);
    private final AuditLogRepository audits = mock(AuditLogRepository.class);
    private final IUserReportTrackingService tracking = mock(IUserReportTrackingService.class);
    private final EvidenceAnalysisQueueService evidenceAnalysis = mock(EvidenceAnalysisQueueService.class);
    private final OwnReportService service = new OwnReportService(reports, indicators, evidence, moderation,
            categories, audits, tracking, Clock.systemUTC(), evidenceAnalysis);
    private final UserPrincipal principal = UserPrincipal.builder().id(7L).build();
    private Report report;

    @BeforeEach
    void setup() {
        report = Report.builder().id(1L).status(ReportStatus.PENDING).reporterUser(User.builder().id(7L).build()).build();
        when(reports.findByIdAndReporterUserId(1L, 7L)).thenReturn(Optional.of(report));
    }

    @Test
    void withdrawPreservesRecordAndWritesAudit() {
        service.withdraw(1L, principal);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.WITHDRAWN);
        verify(reports).save(report);
        verify(reports, never()).delete(any(Report.class));
        verify(audits).save(any(AuditLog.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"IN_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"})
    void cannotChangeReportAfterPending(String status) {
        report.setStatus(ReportStatus.valueOf(status));
        assertThatThrownBy(() -> service.withdraw(1L, principal)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.update(1L, request(), principal)).isInstanceOf(ResponseStatusException.class);
        verify(reports, never()).save(any());
    }

    @Test
    void anotherOwnersReportIsHidden() {
        when(reports.findByIdAndReporterUserId(1L, 7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.withdraw(1L, principal)).isInstanceOf(ResourceNotFoundException.class);
        verify(reports, never()).save(any());
    }

    @Test
    void pendingReportRemainsEditableUntilStatusChangesToInReview() {
        service.update(1L, request(), principal);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PENDING);
        service.withdraw(1L, principal);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.WITHDRAWN);
    }

    @Test
    void updatePreservesEvidenceWhenNotProvidedAndDoesNotChangeTargetOrCreationTime() {
        Indicator target = new Indicator();
        report.setIndicator(target);
        service.update(1L, request(), principal);
        assertThat(report.getDescription()).isEqualTo("Mô tả mới");
        assertThat(report.getIndicator()).isSameAs(target);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.PENDING);
        verifyNoInteractions(evidence);
        verify(tracking).getReportDetail(7L, 1L);
    }

    @Test
    void explicitEmptyEvidenceListClearsEvidence() {
        var request = request();
        request.setEvidences(List.of());
        when(evidence.findByReportId(1L)).thenReturn(List.of(new ReportEvidence()));
        service.update(1L, request, principal);
        verify(evidence).deleteAll(anyList());
    }

    @Test
    void partialUpdatePreservesCategoryAndRegionAndNormalizesBlankMessage() {
        var category = ScamCategory.builder().id(2L).build();
        report.setCategory(category);
        report.setRegionCode(VietnamProvince.HA_NOI);
        var change = request();
        change.setReportedMessage("   ");
        service.update(1L, change, principal);
        assertThat(report.getCategory()).isSameAs(category);
        assertThat(report.getRegionCode()).isEqualTo(VietnamProvince.HA_NOI);
        assertThat(report.getReportedMessage()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "99", "Hà Nội"})
    void rejectsInvalidRegionOnUpdate(String region) {
        var change = request();
        change.setRegionCode(region);
        assertThatThrownBy(() -> service.update(1L, change, principal))
                .isInstanceOf(BadRequestException.class);
        verify(reports, never()).save(any());
    }

    @Test
    void omittedMessagePreservesOriginalMessage() {
        report.setReportedMessage("Tin nhắn gốc cần giữ nguyên");
        service.update(1L, request(), principal);
        assertThat(report.getReportedMessage()).isEqualTo("Tin nhắn gốc cần giữ nguyên");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "\t\n"})
    void blankMessageClearsOriginalMessage(String message) {
        report.setReportedMessage("Tin nhắn gốc");
        var change = request();
        change.setReportedMessage(message);
        service.update(1L, change, principal);
        assertThat(report.getReportedMessage()).isNull();
    }

    @Test
    void nonBlankMessageReplacesOriginalWithoutChangingContent() {
        report.setReportedMessage("Tin nhắn gốc");
        var change = request();
        change.setReportedMessage("  Nội dung mới\nGiữ định dạng  ");
        service.update(1L, change, principal);
        assertThat(report.getReportedMessage()).isEqualTo("  Nội dung mới\nGiữ định dạng  ");
    }

    private UpdateOwnReportRequest request() {
        return UpdateOwnReportRequest.builder().description("Mô tả mới").build();
    }
}
