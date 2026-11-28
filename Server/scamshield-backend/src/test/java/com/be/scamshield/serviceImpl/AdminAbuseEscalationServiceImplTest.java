package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.AbuseEscalationDecision;
import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.dto.admin.AdminAbuseEscalationResponse;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.AbuseFlagRepository;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ModerationActionRepository;
import com.be.scamshield.repository.ReportEvidenceRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminAbuseEscalationServiceImplTest {

    @Mock
    private AbuseFlagRepository abuseFlagRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private Clock applicationClock;

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private ReportEvidenceRepository reportEvidenceRepository;

    @Mock
    private ModerationActionRepository moderationActionRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AdminAbuseEscalationServiceImpl service;

    private final Instant fixedInstant = Instant.parse("2026-11-19T08:00:00Z");
    private final ZoneId zoneId = ZoneId.of("UTC");
    private final LocalDateTime now = LocalDateTime.ofInstant(fixedInstant, zoneId);

    private User admin;
    private UserPrincipal adminPrincipal;
    private User targetUser;
    private AbuseFlag escalationFlag;

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.instant()).thenReturn(fixedInstant);
        lenient().when(applicationClock.getZone()).thenReturn(zoneId);

        Role adminRole = new Role();
        adminRole.setName("ADMINISTRATOR");

        admin = new User();
        admin.setId(1L);
        admin.setEmail("admin@example.com");
        admin.setFullName("Administrator");
        admin.setStatus("ACTIVE");
        admin.setRole(adminRole);

        adminPrincipal = UserPrincipal.create(admin);

        targetUser = new User();
        targetUser.setId(2L);
        targetUser.setEmail("target@example.com");
        targetUser.setFullName("Target User");
        targetUser.setStatus("ACTIVE");

        escalationFlag = new AbuseFlag();
        escalationFlag.setId(100L);
        escalationFlag.setUser(targetUser);
        escalationFlag.setStatus(AbuseFlagStatus.PENDING.name());
        escalationFlag.setCreatedAt(now.minusDays(1));

        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
    }

    private void mockStandardLookups() {
        when(abuseFlagRepository.findTargetUserId(100L)).thenReturn(Optional.of(2L));
        when(userRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(targetUser));
        when(abuseFlagRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(escalationFlag));
    }

    // UTCID01: Normal - Decision DISMISS, status PENDING -> DISMISSED, target stays ACTIVE, resolvedAt set
    @Test
    @DisplayName("UTCID01: Quyết định DISMISS cập nhật trạng thái hồ sơ thành DISMISSED và giữ nguyên tài khoản")
    void utcid01_decisionDismiss_updatesStatusToDismissed() {
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.DISMISS)
                .reason("Hồ sơ không có dấu hiệu vi phạm theo kiểm tra thực tế")
                .build();

        AdminAbuseEscalationResponse response = service.decideEscalation(100L, request, adminPrincipal);

        assertThat(response).isNotNull();
        assertThat(escalationFlag.getStatus()).isEqualTo(AbuseFlagStatus.DISMISSED.name());
        assertThat(escalationFlag.getResolvedAt()).isEqualTo(now);
        verify(abuseFlagRepository).save(escalationFlag);
        verify(auditLogRepository).save(argThat(log ->
                "DECIDE_ABUSE_ESCALATION_DISMISS".equals(log.getAction()) &&
                "DISMISSED".equals(log.getNewValue()) &&
                request.getReason().equals(log.getReason())
        ));
        verify(userRepository, never()).save(targetUser);
    }

    // UTCID02: Normal - Decision FLAG, status PENDING -> OPEN, target stays ACTIVE, resolvedAt is null
    @Test
    @DisplayName("UTCID02: Quyết định FLAG chuyển trạng thái sang OPEN và giữ nguyên tài khoản")
    void utcid02_decisionFlag_updatesStatusToOpen() {
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("Tài khoản có dấu hiệu vi phạm cần tiếp tục giám sát kỹ")
                .build();

        AdminAbuseEscalationResponse response = service.decideEscalation(100L, request, adminPrincipal);

        assertThat(response).isNotNull();
        assertThat(escalationFlag.getStatus()).isEqualTo(AbuseFlagStatus.OPEN.name());
        assertThat(escalationFlag.getResolvedAt()).isNull();
        verify(abuseFlagRepository).save(escalationFlag);
        verify(auditLogRepository).save(argThat(log ->
                "DECIDE_ABUSE_ESCALATION_FLAG".equals(log.getAction()) &&
                "OPEN".equals(log.getNewValue())
        ));
        verify(userRepository, never()).save(targetUser);
    }

    // UTCID03: Normal - Decision SUSPEND, status PENDING -> OPEN, target becomes SUSPENDED, UPDATE_STATUS audit
    @Test
    @DisplayName("UTCID03: Quyết định SUSPEND chuyển tài khoản sang SUSPENDED và lưu audit")
    void utcid03_decisionSuspend_suspendsTargetUser() {
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.SUSPEND)
                .reason("Tạm khóa tài khoản do hành vi spam báo cáo lặp lại nhiều lần")
                .build();

        AdminAbuseEscalationResponse response = service.decideEscalation(100L, request, adminPrincipal);

        assertThat(response).isNotNull();
        assertThat(escalationFlag.getStatus()).isEqualTo(AbuseFlagStatus.OPEN.name());
        assertThat(targetUser.getStatus()).isEqualTo("SUSPENDED");
        verify(userRepository).save(targetUser);
        verify(auditLogRepository).save(argThat(log ->
                "UPDATE_STATUS".equals(log.getAction()) &&
                "USER".equals(log.getEntityType()) &&
                "SUSPENDED".equals(log.getNewValue())
        ));
    }

    // UTCID04: Normal - Decision BAN, status PENDING -> OPEN, target becomes BANNED, UPDATE_STATUS audit
    @Test
    @DisplayName("UTCID04: Quyết định BAN chuyển tài khoản sang BANNED và lưu audit")
    void utcid04_decisionBan_bansTargetUser() {
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.BAN)
                .reason("Cấm vĩnh viễn tài khoản do hành vi quấy phá hệ thống nghiêm trọng")
                .build();

        AdminAbuseEscalationResponse response = service.decideEscalation(100L, request, adminPrincipal);

        assertThat(response).isNotNull();
        assertThat(escalationFlag.getStatus()).isEqualTo(AbuseFlagStatus.OPEN.name());
        assertThat(targetUser.getStatus()).isEqualTo("BANNED");
        verify(userRepository).save(targetUser);
        verify(auditLogRepository).save(argThat(log ->
                "UPDATE_STATUS".equals(log.getAction()) &&
                "USER".equals(log.getEntityType()) &&
                "BANNED".equals(log.getNewValue())
        ));
    }

    // UTCID05: Abnormal - Escalation status OPEN -> AbuseEscalationConflictException
    @Test
    @DisplayName("UTCID05: Ném AbuseEscalationConflictException khi hồ sơ đã ở trạng thái OPEN")
    void utcid05_statusOpen_throwsConflictException() {
        escalationFlag.setStatus(AbuseFlagStatus.OPEN.name());
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("Tài khoản có dấu hiệu vi phạm cần tiếp tục giám sát kỹ")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(AbuseEscalationConflictException.class)
                .hasMessageContaining("Hồ sơ đã có quyết định xử lý");
        verify(abuseFlagRepository, never()).save(any());
    }

    // UTCID06: Abnormal - Escalation status DISMISSED -> AbuseEscalationConflictException
    @Test
    @DisplayName("UTCID06: Ném AbuseEscalationConflictException khi hồ sơ đã ở trạng thái DISMISSED")
    void utcid06_statusDismissed_throwsConflictException() {
        escalationFlag.setStatus(AbuseFlagStatus.DISMISSED.name());
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("Tài khoản có dấu hiệu vi phạm cần tiếp tục giám sát kỹ")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(AbuseEscalationConflictException.class)
                .hasMessageContaining("Hồ sơ đã có quyết định xử lý");
        verify(abuseFlagRepository, never()).save(any());
    }

    // UTCID07: Abnormal - Escalation status RESOLVED (legacy not supported) -> ResourceNotFoundException
    @Test
    @DisplayName("UTCID07: Ném ResourceNotFoundException khi hồ sơ có trạng thái cũ không hỗ trợ")
    void utcid07_statusLegacyResolved_throwsResourceNotFoundException() {
        escalationFlag.setStatus("RESOLVED");
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("Tài khoản có dấu hiệu vi phạm cần tiếp tục giám sát kỹ")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(abuseFlagRepository, never()).save(any());
    }

    // UTCID08: Abnormal - Target account already BANNED, decision SUSPEND -> AbuseEscalationConflictException
    @Test
    @DisplayName("UTCID08: Ném AbuseEscalationConflictException khi SUSPEND tài khoản đã bị BANNED")
    void utcid08_suspendBannedUser_throwsConflictException() {
        targetUser.setStatus("BANNED");
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.SUSPEND)
                .reason("Tạm khóa tài khoản do hành vi spam báo cáo lặp lại nhiều lần")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(AbuseEscalationConflictException.class)
                .hasMessageContaining("Không thể chuyển tài khoản đã bị cấm sang tạm khóa");
        verify(userRepository, never()).save(any());
    }

    // UTCID09: Abnormal - Target account is current Admin, decision SUSPEND -> BadRequestException
    @Test
    @DisplayName("UTCID09: Ném BadRequestException khi Admin tự khóa chính mình")
    void utcid09_adminSuspendsSelf_throwsBadRequestException() {
        targetUser.setId(1L); // Same ID as admin
        escalationFlag.setUser(targetUser);
        when(abuseFlagRepository.findTargetUserId(100L)).thenReturn(Optional.of(1L));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(targetUser));
        when(abuseFlagRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(escalationFlag));

        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.SUSPEND)
                .reason("Tạm khóa tài khoản do hành vi spam báo cáo lặp lại nhiều lần")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bạn không thể tự khóa hoặc cấm tài khoản của chính mình");
        verify(userRepository, never()).save(any());
    }

    // UTCID10: Abnormal - Target account is current Admin, decision BAN -> BadRequestException
    @Test
    @DisplayName("UTCID10: Ném BadRequestException khi Admin tự cấm chính mình")
    void utcid10_adminBansSelf_throwsBadRequestException() {
        targetUser.setId(1L); // Same ID as admin
        escalationFlag.setUser(targetUser);
        when(abuseFlagRepository.findTargetUserId(100L)).thenReturn(Optional.of(1L));
        when(userRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(targetUser));
        when(abuseFlagRepository.findByIdForUpdate(100L)).thenReturn(Optional.of(escalationFlag));

        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.BAN)
                .reason("Cấm vĩnh viễn tài khoản do hành vi quấy phá hệ thống nghiêm trọng")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bạn không thể tự khóa hoặc cấm tài khoản của chính mình");
        verify(userRepository, never()).save(any());
    }

    // UTCID11: Abnormal - Escalation record not found -> ResourceNotFoundException
    @Test
    @DisplayName("UTCID11: Ném ResourceNotFoundException khi không tìm thấy hồ sơ lạm dụng")
    void utcid11_escalationNotFound_throwsResourceNotFoundException() {
        when(abuseFlagRepository.findTargetUserId(999L)).thenReturn(Optional.empty());

        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("Tài khoản có dấu hiệu vi phạm cần tiếp tục giám sát kỹ")
                .build();

        assertThatThrownBy(() -> service.decideEscalation(999L, request, adminPrincipal))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Không tìm thấy hồ sơ lạm dụng");
        verify(abuseFlagRepository, never()).findByIdForUpdate(any());
    }

    // UTCID12: Boundary - reason.strip().length() = 19 (< 20) -> BadRequestException
    @Test
    @DisplayName("UTCID12: Ném BadRequestException khi lý do có độ dài 19 ký tự sau khi strip")
    void utcid12_reasonLength19_throwsBadRequestException() {
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("   1234567890123456789   ") // 19 chars after strip
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lý do quyết định phải từ 20 đến 2000 ký tự");
    }

    // UTCID13: Boundary - reason.strip().length() = 20 (min allowed) -> Success
    @Test
    @DisplayName("UTCID13: Thành công khi lý do có đúng 20 ký tự sau khi strip")
    void utcid13_reasonLength20_succeeds() {
        mockStandardLookups();
        String reason20 = "   12345678901234567890   "; // 20 chars stripped
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason(reason20)
                .build();

        AdminAbuseEscalationResponse response = service.decideEscalation(100L, request, adminPrincipal);

        assertThat(response).isNotNull();
        assertThat(escalationFlag.getStatus()).isEqualTo(AbuseFlagStatus.OPEN.name());
        verify(auditLogRepository).save(argThat(log ->
                "12345678901234567890".equals(log.getReason())
        ));
    }

    // UTCID14: Boundary - reason.strip().length() = 2001 (> 2000) -> BadRequestException
    @Test
    @DisplayName("UTCID14: Ném BadRequestException khi lý do vượt quá 2000 ký tự sau khi strip")
    void utcid14_reasonLength2001_throwsBadRequestException() {
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.FLAG)
                .reason("a".repeat(2001))
                .build();

        assertThatThrownBy(() -> service.decideEscalation(100L, request, adminPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lý do quyết định phải từ 20 đến 2000 ký tự");
    }

    // UTCID15: Normal - Target account already BANNED, decision DISMISS -> status preserved BANNED, escalation DISMISSED
    @Test
    @DisplayName("UTCID15: Quyết định DISMISS cho tài khoản BANNED giữ nguyên trạng thái tài khoản BANNED")
    void utcid15_dismissOnBannedUser_preservesBannedStatus() {
        targetUser.setStatus("BANNED");
        mockStandardLookups();
        DecideAbuseEscalationRequest request = DecideAbuseEscalationRequest.builder()
                .decision(AbuseEscalationDecision.DISMISS)
                .reason("Hồ sơ lạm dụng không chính xác, hủy hồ sơ đối với tài khoản")
                .build();

        AdminAbuseEscalationResponse response = service.decideEscalation(100L, request, adminPrincipal);

        assertThat(response).isNotNull();
        assertThat(escalationFlag.getStatus()).isEqualTo(AbuseFlagStatus.DISMISSED.name());
        assertThat(targetUser.getStatus()).isEqualTo("BANNED");
        verify(userRepository, never()).save(targetUser); // oldStatus == newStatus == "BANNED"
        verify(auditLogRepository).save(argThat(log ->
                "DECIDE_ABUSE_ESCALATION_DISMISS".equals(log.getAction()) &&
                "DISMISSED".equals(log.getNewValue())
        ));
    }
}
