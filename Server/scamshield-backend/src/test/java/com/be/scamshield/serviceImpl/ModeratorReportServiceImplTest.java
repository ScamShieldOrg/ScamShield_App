package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.dto.response.ModeratorQueueCountsResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ModeratorReportServiceImplTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private ReportEvidenceRepository reportEvidenceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ModerationActionRepository moderationActionRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private ConfirmedIndicatorRepository confirmedIndicatorRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private ScamCategorieRepository scamCategorieRepository;

    @Mock
    private ReputationTransactionRepository reputationTransactionRepository;

    @InjectMocks
    private ModeratorReportServiceImpl service;

    private Report testReport;
    private ReportEvidence testEvidence;
    private Indicator testIndicator;
    private ScamCategory testCategory;
    private User testUser;
    private User moderatorUser;
    private UserPrincipal moderatorPrincipal;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(10L)
                .email("nguyenthanh_vn@example.com")
                .fullName("Nguyen Thanh")
                .phoneNumber("0909111222")
                .reputationPoints(50)
                .build();

        moderatorUser = User.builder()
                .id(99L)
                .email("moderator@scamshield.vn")
                .fullName("Mod Sentinel")
                .build();

        moderatorPrincipal = UserPrincipal.builder()
                .id(99L)
                .email("moderator@scamshield.vn")
                .username("moderator@scamshield.vn")
                .role("ROLE_MODERATOR")
                .build();

        testCategory = ScamCategory.builder()
                .id(5L)
                .code("BANK_OTP")
                .name("Lừa đảo ngân hàng / OTP Phishing")
                .build();

        testIndicator = Indicator.builder()
                .id(100L)
                .type("PHONE")
                .normalizedValue("0909123456")
                .displayValue("0909 123 456")
                .build();

        testReport = Report.builder()
                .id(1891L)
                .indicator(testIndicator)
                .category(testCategory)
                .reporterUser(testUser)
                .status("PENDING")

                .createdAt(LocalDateTime.of(2024, 1, 15, 14, 32))
                .updatedAt(LocalDateTime.of(2024, 1, 15, 14, 32))
                .build();

        testEvidence = ReportEvidence.builder()
                .id(1L)
                .report(testReport)
                .fileName("screenshot_1.jpg")
                .fileUrl("https://storage.scamshield.vn/evidences/screenshot_1.jpg")
                .evidenceType("IMAGE")
                .verificationStatus("PENDING")
                .createdAt(LocalDateTime.of(2024, 1, 15, 14, 32))
                .build();
    }

    @Test
    void getReportQueue_Success_MapsAllFieldsCorrectlyAndLeavesAiFieldsEmpty() {
        Pageable pageable = PageRequest.of(0, 20);
        when(reportRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(testReport), pageable, 1));
        when(reportEvidenceRepository.findByReportIdIn(List.of(1891L)))
                .thenReturn(List.of(testEvidence));

        ModeratorReportFilterRequest filter = ModeratorReportFilterRequest.builder().tab("ALL").build();
        PaginatedResponse<ModeratorReportResponse> response = service.getReportQueue(filter, pageable);

        assertThat(response.getData()).hasSize(1);
        ModeratorReportResponse item = response.getData().get(0);

        assertThat(item.getId()).isEqualTo("CS-2024-1891");
        assertThat(item.getRawId()).isEqualTo(1891L);
        assertThat(item.getTargetIdentifier()).isEqualTo("0909 123 456");
        assertThat(item.getTargetType()).isEqualTo("PHONE");
        assertThat(item.getCategory()).isEqualTo("Lừa đảo ngân hàng / OTP Phishing");
        assertThat(item.getCategoryId()).isEqualTo(5L);
        assertThat(item.getReportCount()).isEqualTo(1);
        assertThat(item.getReportedBy()).isEqualTo("nguyenthanh_vn");
        assertThat(item.getReportedAt()).isEqualTo("15/01 14:32");
        assertThat(item.getStatus()).isEqualTo("Pending");

        // Theo yêu cầu của người dùng: Hiện tại các fields này để trống trong dto
        assertThat(item.getAiScore()).isNull();
        assertThat(item.getAiRiskLevel()).isNull();
        assertThat(item.getAiConfidence()).isNull();

        // Single ScamCategory mapping in taxonomies
        assertThat(item.getTaxonomies()).containsExactly("Lừa đảo ngân hàng / OTP Phishing");

        // Evidence mapping
        assertThat(item.getEvidences()).hasSize(1);
        assertThat(item.getEvidenceCount()).isEqualTo(1);
        assertThat(item.getEvidences().get(0).getId()).isEqualTo("ev-1");
        assertThat(item.getEvidences().get(0).getName()).isEqualTo("screenshot_1.jpg");
        assertThat(item.getEvidences().get(0).getType()).isEqualTo("image");
    }

    @Test
    void getReportQueue_EmptyResult_ReturnsEmptyPaginatedResponse() {
        Pageable pageable = PageRequest.of(0, 20);
        when(reportRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(Collections.emptyList(), pageable, 0));

        ModeratorReportFilterRequest filter = ModeratorReportFilterRequest.builder().tab("ALL").build();
        PaginatedResponse<ModeratorReportResponse> response = service.getReportQueue(filter, pageable);

        assertThat(response.getData()).isEmpty();
        assertThat(response.getTotalItems()).isEqualTo(0);
    }

    @Test
    void getQueueCounts_Success_ReturnsAggregatedCounts() {
        when(reportRepository.count()).thenReturn(7L);
        when(reportRepository.countByStatusIgnoreCase("PENDING")).thenReturn(3L);
        when(reportRepository.countByStatusIgnoreCase("IN_REVIEW")).thenReturn(1L);

        ModeratorQueueCountsResponse counts = service.getQueueCounts();

        assertThat(counts.getAll()).isEqualTo(7L);
        assertThat(counts.getPending()).isEqualTo(3L);
        assertThat(counts.getInReview()).isEqualTo(1L);
    }

    @Test
    void getReportById_Success_ReturnsReportDetail() {
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        when(reportEvidenceRepository.findByReportId(1891L)).thenReturn(List.of(testEvidence));

        ModeratorReportResponse result = service.getReportById(1891L);

        assertThat(result.getId()).isEqualTo("CS-2024-1891");
        assertThat(result.getTargetIdentifier()).isEqualTo("0909 123 456");
        assertThat(result.getEvidences()).hasSize(1);
    }

    @ParameterizedTest
    @ValueSource(ints = {0, 1, 3})
    void getReportById_CountsProvidedEvidenceWithoutScoring(int count) {
        List<ReportEvidence> provided = IntStream.range(0, count)
                .mapToObj(index -> ReportEvidence.builder().id((long) index + 1)
                        .report(testReport).evidenceType("IMAGE").verificationStatus("PENDING").build())
                .toList();
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        when(reportEvidenceRepository.findByReportId(1891L)).thenReturn(provided);

        ModeratorReportResponse result = service.getReportById(1891L);

        assertThat(result.getEvidenceCount()).isEqualTo(count);
        assertThat(result.getEvidences()).hasSize(count);
    }

    @Test
    void getReportById_NotFound_ThrowsResourceNotFoundException() {
        when(reportRepository.findById(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getReportById(9999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9999");
    }

    @Test
    void getReportQueue_WithSearchFilter_BuildsValidSpecification() {
        Pageable pageable = PageRequest.of(0, 20);
        when(reportRepository.findAll(any(Specification.class), eq(pageable)))
                .thenReturn(new PageImpl<>(List.of(testReport), pageable, 1));
        when(reportEvidenceRepository.findByReportIdIn(List.of(1891L)))
                .thenReturn(List.of(testEvidence));

        ModeratorReportFilterRequest filter = ModeratorReportFilterRequest.builder()
                .search("OTP Phishing lừa đảo qua tin nhắn")
                .build();
        PaginatedResponse<ModeratorReportResponse> response = service.getReportQueue(filter, pageable);
        assertThat(response.getData()).hasSize(1);
    }

    @Test
    void makeDecision_WhenApprove_UpdatesStatusAndBulkApprovesPendingReportsOfSameIndicator() {
        User secondUser = User.builder()
                .id(20L)
                .email("victim2@example.com")
                .fullName("Victim Two")
                .reputationPoints(10)
                .build();

        Report secondReport = Report.builder()
                .id(1892L)
                .indicator(testIndicator)
                .category(testCategory)
                .reporterUser(secondUser)
                .status("PENDING")


                .createdAt(LocalDateTime.of(2024, 1, 15, 15, 0))
                .build();

        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        when(userRepository.findById(99L)).thenReturn(Optional.of(moderatorUser));
        when(scamCategorieRepository.findById(1L)).thenReturn(Optional.of(testCategory));
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "PENDING"))
                .thenReturn(List.of(testReport, secondReport));
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "IN_REVIEW"))
                .thenReturn(List.of());
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "IN_REVIEW"))
                .thenReturn(List.of());
        when(confirmedIndicatorRepository.findByIndicatorId(100L)).thenReturn(Optional.empty());
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportEvidenceRepository.findByReportId(1891L)).thenReturn(List.of(testEvidence));

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Xác minh bằng chứng đối chiếu với sao kê ngân hàng thành công đầy đủ")
                .categoryId(1L)
                .build();

        ModeratorReportResponse response = service.makeDecision(1891L, moderatorPrincipal, request);

        assertThat(response.getStatus()).isEqualTo("Approved");
        assertThat(testReport.getStatus()).isEqualTo("APPROVED");

        // Verify bulk approval of secondReport of the same indicator
        assertThat(secondReport.getStatus()).isEqualTo("APPROVED");

        verify(confirmedIndicatorRepository).save(any(ConfirmedIndicator.class));
        verify(moderationActionRepository, times(2)).save(any(ModerationAction.class));
        verify(auditLogRepository, times(2)).save(any(AuditLog.class));
        verify(notificationRepository, times(2)).save(any(Notification.class));
        verify(reputationTransactionRepository, times(2)).save(any(ReputationTransaction.class));
        assertThat(testUser.getReputationPoints()).isEqualTo(80); // 50 + 30
        assertThat(secondUser.getReputationPoints()).isEqualTo(40); // 10 + 30
    }

    @Test
    void makeDecision_WhenReject_UpdatesStatusAndBulkRejectsPendingReportsOfSameIndicator() {
        User secondUser = User.builder()
                .id(20L)
                .email("victim2@example.com")
                .fullName("Victim Two")
                .build();

        Report secondReport = Report.builder()
                .id(1892L)
                .indicator(testIndicator)
                .category(testCategory)
                .reporterUser(secondUser)
                .status("PENDING")


                .createdAt(LocalDateTime.of(2024, 1, 15, 15, 0))
                .build();

        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        when(userRepository.findById(99L)).thenReturn(Optional.of(moderatorUser));
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "PENDING"))
                .thenReturn(List.of(testReport, secondReport));
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "IN_REVIEW"))
                .thenReturn(List.of());
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportEvidenceRepository.findByReportId(1891L)).thenReturn(List.of(testEvidence));

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.REJECT)
                .reason("Bằng chứng cung cấp không đủ rõ ràng và thông tin số điện thoại chưa chính xác")
                .build();

        ModeratorReportResponse response = service.makeDecision(1891L, moderatorPrincipal, request);

        assertThat(response.getStatus()).isEqualTo("Rejected");
        assertThat(testReport.getStatus()).isEqualTo("REJECTED");
        assertThat(secondReport.getStatus()).isEqualTo("REJECTED");

        verify(moderationActionRepository, times(2)).save(any(ModerationAction.class));
        verify(notificationRepository, times(2)).save(any(Notification.class));
    }

    @Test
    void makeDecision_WhenReportAlreadyProcessed_ThrowsBadRequestException() {
        testReport.setStatus("APPROVED");
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Thử lại quyết định kiểm duyệt cho hồ sơ đã hoàn thành")
                .build();

        assertThatThrownBy(() -> service.makeDecision(1891L, moderatorPrincipal, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("đã có quyết định xử lý trước đó");
    }

    @Test
    void makeDecision_WhenReportNotFound_ThrowsResourceNotFoundException() {
        when(reportRepository.findById(9999L)).thenReturn(Optional.empty());

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Thử lại quyết định kiểm duyệt cho hồ sơ không tồn tại")
                .build();

        assertThatThrownBy(() -> service.makeDecision(9999L, moderatorPrincipal, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9999");
    }

    @Test
    void makeDecision_WhenReportStatusNullOrInvalid_ThrowsBadRequestException() {
        testReport.setStatus(null);
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Thử lại quyết định kiểm duyệt cho hồ sơ không có trạng thái hợp lệ")
                .build();

        assertThatThrownBy(() -> service.makeDecision(1891L, moderatorPrincipal, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể xử lý hồ sơ ở trạng thái hiện tại");
    }

    @Test
    void makeDecision_WhenSiblingReportsInReview_BulkProcessesAll() {
        Report inReviewReport = Report.builder()
                .id(1893L)
                .indicator(testIndicator)
                .category(testCategory)
                .reporterUser(testUser)
                .status("IN_REVIEW")

                .createdAt(LocalDateTime.of(2024, 1, 15, 16, 0))
                .build();

        Report otherInReviewReport = Report.builder()
                .id(1894L)
                .indicator(testIndicator)
                .category(testCategory)
                .reporterUser(testUser)
                .status("IN_REVIEW")

                .createdAt(LocalDateTime.of(2024, 1, 15, 17, 0))
                .build();

        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        when(userRepository.findById(99L)).thenReturn(Optional.of(moderatorUser));
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "PENDING"))
                .thenReturn(List.of(testReport));
        when(reportRepository.findByIndicatorIdAndStatusIgnoreCase(100L, "IN_REVIEW"))
                .thenReturn(List.of(inReviewReport, otherInReviewReport));
        when(reportRepository.save(any(Report.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(reportEvidenceRepository.findByReportId(1891L)).thenReturn(List.of(testEvidence));

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Xác minh bằng chứng đối chiếu với sao kê ngân hàng thành công đầy đủ")
                .build();

        service.makeDecision(1891L, moderatorPrincipal, request);

        assertThat(testReport.getStatus()).isEqualTo("APPROVED");
        assertThat(inReviewReport.getStatus()).isEqualTo("APPROVED");
        // Every sibling in a decidable status is processed.
        assertThat(otherInReviewReport.getStatus()).isEqualTo("APPROVED");
    }

    @Test
    void makeDecision_WhenCurrentUserNull_ThrowsBadRequestException() {
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Thẩm định kiểm duyệt với principal null")
                .build();

        assertThatThrownBy(() -> service.makeDecision(1891L, null, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Thông tin định danh kiểm duyệt viên không hợp lệ");
    }

    @Test
    void makeDecision_WhenCurrentUserIdNull_ThrowsBadRequestException() {
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        UserPrincipal noIdPrincipal = UserPrincipal.builder().username("mod").build();

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Thẩm định kiểm duyệt với principal không có id")
                .build();

        assertThatThrownBy(() -> service.makeDecision(1891L, noIdPrincipal, request))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Thông tin định danh kiểm duyệt viên không hợp lệ");
    }

    @Test
    void makeDecision_WhenModeratorUserNotFoundInDb_ThrowsResourceNotFoundException() {
        when(reportRepository.findById(1891L)).thenReturn(Optional.of(testReport));
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Thẩm định kiểm duyệt với tài khoản kiểm duyệt viên không tồn tại trong DB")
                .build();

        assertThatThrownBy(() -> service.makeDecision(1891L, moderatorPrincipal, request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy thông tin tài khoản kiểm duyệt viên");
    }
}
