package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.*;
import com.be.scamshield.dto.admin.AdminAbuseEscalationResponse;
import com.be.scamshield.dto.request.CreateAbuseEscalationRequest;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.response.ModeratorAbuseEscalationResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * End-to-End Simulation of the Abuse Escalation, Concurrency Lock & Sanction Lifecycle.
 */
@ExtendWith(MockitoExtension.class)
class AbuseEscalationFlowE2ETest {

    @Mock private IndicatorRepository indicatorRepository;
    @Mock private WhitelistEntryRepository whitelistEntryRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private ReportEvidenceRepository reportEvidenceRepository;
    @Mock private UserRepository userRepository;
    @Mock private ModerationActionRepository moderationActionRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private ConfirmedIndicatorRepository confirmedIndicatorRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private ScamCategorieRepository scamCategorieRepository;
    @Mock private ReputationTransactionRepository reputationTransactionRepository;
    @Mock private ReportAssignmentService reviewAssignments;
    @Mock private EvidenceComparisonService evidenceSimilarities;
    @Mock private AbuseFlagRepository abuseFlagRepository;
    @Mock private Clock applicationClock;

    @InjectMocks private ModeratorReportServiceImpl moderatorReportService;
    @InjectMocks private ModeratorAbuseEscalationServiceImpl moderatorAbuseEscalationService;
    @InjectMocks private AdminAbuseEscalationServiceImpl adminAbuseEscalationService;

    // Test Actors
    private User reporterUser;
    private User moderatorAUser;
    private User moderatorBUser;
    private User adminUser;

    private UserPrincipal reporterPrincipal;
    private UserPrincipal moderatorAPrincipal;
    private UserPrincipal moderatorBPrincipal;
    private UserPrincipal adminPrincipal;

    private Role userRole;
    private Role moderatorRole;
    private Role adminRole;

    private Indicator testIndicator;
    private ScamCategory testCategory;

    @BeforeEach
    void setUp() {
        userRole = Role.builder().id(1L).name("REGISTERED_USER").build();
        moderatorRole = Role.builder().id(2L).name("MODERATOR").build();
        adminRole = Role.builder().id(3L).name("ADMINISTRATOR").build();

        reporterUser = User.builder()
                .id(100L)
                .fullName("Nguyễn Văn A")
                .email("nguyenvana@gmail.com")
                .phoneNumber("0987654321")
                .role(userRole)
                .status("ACTIVE")
                .reputationPoints(50)
                .createdAt(LocalDateTime.of(2025, 1, 1, 0, 0))
                .build();

        moderatorAUser = User.builder()
                .id(201L)
                .fullName("Kiểm duyệt viên 1")
                .email("moderator@scamshield.vn")
                .role(moderatorRole)
                .status("ACTIVE")
                .build();

        moderatorBUser = User.builder()
                .id(202L)
                .fullName("Mai Phương")
                .email("moderator.phuong@scamshield.vn")
                .role(moderatorRole)
                .status("ACTIVE")
                .build();

        adminUser = User.builder()
                .id(301L)
                .fullName("Admin ScamShield")
                .email("admin@scamshield.vn")
                .role(adminRole)
                .status("ACTIVE")
                .build();

        reporterPrincipal = UserPrincipal.builder().id(100L).username("nguyenvana@gmail.com").role("REGISTERED_USER").build();
        moderatorAPrincipal = UserPrincipal.builder().id(201L).username("moderator@scamshield.vn").role("MODERATOR").build();
        moderatorBPrincipal = UserPrincipal.builder().id(202L).username("moderator.phuong@scamshield.vn").role("MODERATOR").build();
        adminPrincipal = UserPrincipal.builder().id(301L).username("admin@scamshield.vn").role("ADMINISTRATOR").build();

        testIndicator = Indicator.builder()
                .id(501L)
                .type(IndicatorType.PHONE)
                .normalizedValue("0911223344")
                .displayValue("0911223344")
                .build();

        testCategory = ScamCategory.builder().id(10L).name("Mạo danh ngân hàng").build();
    }

    @Test
    @DisplayName("Giai đoạn 1: User gửi báo cáo hợp lệ -> Moderator duyệt APPROVE -> Báo cáo hợp lệ, tăng uy tín")
    void stage1_validReport_moderatorApproves_reputationGrows() {
        Report report = Report.builder()
                .id(1001L)
                .reporterUser(reporterUser)
                .indicator(testIndicator)
                .category(testCategory)
                .status(ReportStatus.PENDING)
                .description("Số điện thoại mạo danh lừa đảo")
                .createdAt(LocalDateTime.now().minusHours(2))
                .build();

        when(reportRepository.findById(1001L)).thenReturn(Optional.of(report));
        when(userRepository.findById(201L)).thenReturn(Optional.of(moderatorAUser));
        when(userRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reporterUser));

        // 1. Moderator A bấm "Bắt đầu duyệt"
        ModeratorReportResponse started = moderatorReportService.startReview(1001L, moderatorAPrincipal);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.IN_REVIEW);
        assertThat(report.getAssignedModerator()).isEqualTo(moderatorAUser);
        assertThat(started.getStatus()).isEqualTo("In Review");

        // 2. Moderator A ra quyết định APPROVE
        ModeratorDecisionRequest decision = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Đã xác minh số điện thoại có dấu hiệu lừa đảo rõ ràng.")
                .build();

        ModeratorReportResponse approved = moderatorReportService.makeDecision(1001L, moderatorAPrincipal, decision);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.APPROVED);
        assertThat(approved.getStatus()).isEqualTo("Approved");

        // Xác nhận giao dịch điểm thưởng và lưu lịch sử
        verify(reputationTransactionRepository, times(1)).save(any(ReputationTransaction.class));
        verify(confirmedIndicatorRepository, times(1)).save(any(ConfirmedIndicator.class));
    }

    @Test
    @DisplayName("Giai đoạn 2: User đổi hành vi sang spam -> Moderator từ chối (REJECT) báo cáo spam")
    void stage2_userSpams_moderatorRejectsReports() {
        Report spamReport = Report.builder()
                .id(1002L)
                .reporterUser(reporterUser)
                .indicator(testIndicator)
                .category(testCategory)
                .status(ReportStatus.IN_REVIEW)
                .assignedModerator(moderatorAUser)
                .description("Spam nội dung sai lệch liên tục")
                .createdAt(LocalDateTime.now())
                .build();

        when(reportRepository.findById(1002L)).thenReturn(Optional.of(spamReport));
        when(userRepository.findById(201L)).thenReturn(Optional.of(moderatorAUser));
        when(userRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reporterUser));

        ModeratorDecisionRequest rejectDecision = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.REJECT)
                .reason("Báo cáo thông tin sai lệch, không có bằng chứng xác thực hợp lệ.")
                .build();

        ModeratorReportResponse rejected = moderatorReportService.makeDecision(1002L, moderatorAPrincipal, rejectDecision);
        assertThat(spamReport.getStatus()).isEqualTo(ReportStatus.REJECTED);
        assertThat(rejected.getStatus()).isEqualTo("Rejected");

        // Lưu log lịch sử xử lý
        verify(auditLogRepository, atLeastOnce()).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Giai đoạn 3: Kiểm thử tương tranh — 2 Moderator cùng duyệt (Mod A bấm trước -> Mod B bị chặn 403)")
    void stage3_concurrencyLock_twoModeratorsAttemptReview() {
        Report report = Report.builder()
                .id(1003L)
                .reporterUser(reporterUser)
                .indicator(testIndicator)
                .status(ReportStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        when(reportRepository.findById(1003L)).thenReturn(Optional.of(report));
        when(userRepository.findById(201L)).thenReturn(Optional.of(moderatorAUser));

        // 1. Moderator A bấm "Bắt đầu duyệt" trước -> Thành công, ca gán cho Mod A
        moderatorReportService.startReview(1003L, moderatorAPrincipal);
        assertThat(report.getStatus()).isEqualTo(ReportStatus.IN_REVIEW);
        assertThat(report.getAssignedModerator().getId()).isEqualTo(201L);

        // 2. Moderator B cố tình gọi startReview trên cùng ca này khi đã IN_REVIEW
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Chỉ kiểm duyệt viên được phân công mới được duyệt báo cáo này"))
                .when(reviewAssignments).requireAssigned(report, moderatorBPrincipal);

        assertThatThrownBy(() -> moderatorReportService.startReview(1003L, moderatorBPrincipal))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403");

        // 3. Moderator B cố tình makeDecision trên ca của Mod A -> Bị chặn 403
        when(userRepository.findById(202L)).thenReturn(Optional.of(moderatorBUser));
        ModeratorDecisionRequest attempt = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Moderator B cố duyệt đè ca của người khác")
                .build();

        assertThatThrownBy(() -> moderatorReportService.makeDecision(1003L, moderatorBPrincipal, attempt))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    @DisplayName("Giai đoạn 4: Moderator Escalate hồ sơ lên Admin — kiểm tra các Edge Case và tạo AbuseFlag PENDING")
    void stage4_moderatorEscalates_edgeCasesAndSuccess() {
        Report spamReport = Report.builder().id(1002L).reporterUser(reporterUser).build();
        when(userRepository.findById(201L)).thenReturn(Optional.of(moderatorAUser));

        // Edge Case 1: Moderator không thể tự escalate chính mình
        CreateAbuseEscalationRequest selfReq = CreateAbuseEscalationRequest.builder()
                .flagType(AbuseFlagType.BULK_REPORTING)
                .reason("Tự gửi cho chính mình để kiểm tra hệ thống.")
                .evidence("Evidence")
                .reportIds(List.of(1002L))
                .build();

        assertThatThrownBy(() -> moderatorAbuseEscalationService.createEscalation(201L, selfReq, moderatorAPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không thể tự chuyển hồ sơ");

        // Edge Case 2: Không thể escalate tài khoản Admin hoặc Moderator
        when(userRepository.findByIdForUpdate(301L)).thenReturn(Optional.of(adminUser));
        assertThatThrownBy(() -> moderatorAbuseEscalationService.createEscalation(301L, selfReq, moderatorAPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chỉ áp dụng chuyển lạm dụng đối với tài khoản người dùng thông thường");

        // Edge Case 3: Không thể escalate tài khoản đã BANNED
        User bannedUser = User.builder().id(105L).role(userRole).status("BANNED").build();
        when(userRepository.findByIdForUpdate(105L)).thenReturn(Optional.of(bannedUser));
        assertThatThrownBy(() -> moderatorAbuseEscalationService.createEscalation(105L, selfReq, moderatorAPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài khoản đã bị cấm vĩnh viễn");

        // Edge Case 4: Không thể tạo duplicate pending escalation
        when(userRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reporterUser));
        when(abuseFlagRepository.existsByUserIdAndStatus(100L, AbuseFlagStatus.PENDING.name())).thenReturn(true);
        assertThatThrownBy(() -> moderatorAbuseEscalationService.createEscalation(100L, selfReq, moderatorAPrincipal))
                .isInstanceOf(AbuseEscalationConflictException.class)
                .hasMessageContaining("Tài khoản đã có hồ sơ đang chờ quản trị viên");

        // Thao tác Hợp lệ: Escalate thành công
        when(abuseFlagRepository.existsByUserIdAndStatus(100L, AbuseFlagStatus.PENDING.name())).thenReturn(false);
        when(reportRepository.findByReporterUserIdAndIdIn(100L, List.of(1002L))).thenReturn(List.of(spamReport));
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-17T00:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(abuseFlagRepository.save(any(AbuseFlag.class))).thenAnswer(invocation -> {
            AbuseFlag flag = invocation.getArgument(0);
            flag.setId(9901L);
            return flag;
        });

        CreateAbuseEscalationRequest validReq = CreateAbuseEscalationRequest.builder()
                .flagType(AbuseFlagType.BULK_REPORTING)
                .reason("Tài khoản gửi lượng lớn báo cáo nhắm đến các tổ chức đã xác minh. Đề nghị xem xét khóa tài khoản.")
                .evidence("Các báo cáo sai phạm: 1002")
                .reportIds(List.of(1002L))
                .build();

        ModeratorAbuseEscalationResponse response = moderatorAbuseEscalationService.createEscalation(100L, validReq, moderatorAPrincipal);
        assertThat(response).isNotNull();
        assertThat(response.getEscalationCode()).isEqualTo("ESC-9901");
        assertThat(response.getStatus()).isEqualTo(AbuseFlagStatus.PENDING);

        // Verify audit log được lưu
        verify(auditLogRepository, times(1)).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("Giai đoạn 5: Admin xem xét hồ sơ và quyết định chế tài (BAN) -> Cập nhật trạng thái người dùng thành BANNED")
    void stage5_adminReviewsAndSanctionsUser() {
        AbuseFlag pendingFlag = AbuseFlag.builder()
                .id(9901L)
                .user(reporterUser)
                .createdBy(moderatorAUser)
                .status(AbuseFlagStatus.PENDING.name())
                .flagType("BULK_REPORTING")
                .severity("HIGH")
                .reason("Người dùng spam báo cáo liên tục")
                .createdAt(LocalDateTime.now())
                .build();

        when(abuseFlagRepository.findTargetUserId(9901L)).thenReturn(Optional.of(100L));
        when(userRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(reporterUser));
        when(abuseFlagRepository.findByIdForUpdate(9901L)).thenReturn(Optional.of(pendingFlag));
        when(userRepository.findById(301L)).thenReturn(Optional.of(adminUser));
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-17T00:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(abuseFlagRepository.save(any(AbuseFlag.class))).thenAnswer(i -> i.getArgument(0));

        // Admin ra quyết định BAN (Cấm vĩnh viễn)
        DecideAbuseEscalationRequest banRequest = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.BAN)
                .reason("Xác nhận hành vi cố ý phá hoại dữ liệu hệ thống. Cấm tài khoản vĩnh viễn.")
                .build();

        AdminAbuseEscalationResponse result = adminAbuseEscalationService.decideEscalation(9901L, banRequest, adminPrincipal);

        // Kiểm tra kết quả
        assertThat(result.getId()).isEqualTo(9901L);
        assertThat(result.getStatus()).isEqualTo(AbuseFlagStatus.OPEN);
        assertThat(result.getUserStatus()).isEqualTo("BANNED");

        // Trạng thái của user trong DB được chuyển thành BANNED
        assertThat(reporterUser.getStatus()).isEqualTo("BANNED");
        verify(userRepository, times(1)).save(reporterUser);
        verify(auditLogRepository, atLeastOnce()).save(any(AuditLog.class));
    }
}
