package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.admin.*;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import com.be.scamshield.repository.AdminUserRepository.UserRow;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminUserServiceImplTest {

    @Mock
    private AdminUserRepository adminUserRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private AbuseFlagRepository abuseFlagRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AdminUserServiceImpl service;

    private User adminUser;
    private User regularUser;
    private Role adminRole;
    private Role userRole;
    private Role modRole;

    @BeforeEach
    void setUp() {
        adminRole = Role.builder().id(1L).name("ADMINISTRATOR").build();
        userRole = Role.builder().id(2L).name("REGISTERED_USER").build();
        modRole = Role.builder().id(3L).name("MODERATOR").build();

        adminUser = User.builder()
                .id(99L)
                .fullName("Hoàng Văn An")
                .email("hvanE.admin@scamshield.gov.vn")
                .phoneNumber("0900000099")
                .role(adminRole)
                .status("ACTIVE")
                .reputationPoints(500)
                .build();

        regularUser = User.builder()
                .id(722L)
                .fullName("Trần Thị Bình Hà")
                .email("tranbinh.ha@outlook.com")
                .phoneNumber("0900000722")
                .role(userRole)
                .status("ACTIVE")
                .reputationPoints(50)
                .build();
    }

    @Test
    @DisplayName("getUsers returns correct page items, total accounts and flagged count matching UI")
    void getUsers_ReturnsExpectedResponse() {
        UserRow row1 = new UserRow(
                41L, "Nguyễn Thanh Hòa", "nguyenthanhhoa@gmail.com", "0900000041",
                "MODERATOR", "ACTIVE",
                LocalDateTime.of(2023, 3, 1, 10, 0), null,
                120, "CHUYEN_GIA", true,
                12L, 0L
        );
        UserRow row2 = new UserRow(
                631L, "mass_reporter_03", "massreport03@proton.me", "0900000631",
                "REGISTERED_USER", "ACTIVE",
                LocalDateTime.of(2024, 1, 15, 8, 30), null,
                10, "TAP_SU", false,
                892L, 1L
        );

        when(adminUserRepository.findUsers(any(), any(), any(), eq(1), eq(10), eq("createdAt"), eq("desc")))
                .thenReturn(List.of(row1, row2));
        when(adminUserRepository.countUsers(any(), any(), any())).thenReturn(2L);
        when(adminUserRepository.countTotalAccounts()).thenReturn(8L);
        when(adminUserRepository.countFlaggedAccounts()).thenReturn(2L);

        AdminUserListResponse result = service.getUsers(null, null, null, 1, 10, "createdAt", "desc");

        assertThat(result).isNotNull();
        assertThat(result.getTotalAccounts()).isEqualTo(8L);
        assertThat(result.getFlaggedAccountsCount()).isEqualTo(2L);
        assertThat(result.getItems()).hasSize(2);

        AdminUserItemResponse item1 = result.getItems().get(0);
        assertThat(item1.getUserCode()).isEqualTo("U-00041");
        assertThat(item1.getRoleLabel()).isEqualTo("Kiểm duyệt viên");
        assertThat(item1.getJoinedFormatted()).isEqualTo("03/2023");
        assertThat(item1.getReportCount()).isEqualTo(12L);
        assertThat(item1.isFlagged()).isFalse();

        AdminUserItemResponse item2 = result.getItems().get(1);
        assertThat(item2.getUserCode()).isEqualTo("U-00631");
        assertThat(item2.getRoleLabel()).isEqualTo("Người dùng");
        assertThat(item2.getReportCount()).isEqualTo(892L);
        assertThat(item2.isFlagged()).isTrue();
        assertThat(item2.isRateLimited()).isTrue();
    }

    @Test
    @DisplayName("getUserDetail returns user details and associated abuse flags")
    void getUserDetail_Success() {
        UserRow row = new UserRow(
                631L, "mass_reporter_03", "massreport03@proton.me", "0900000631",
                "REGISTERED_USER", "ACTIVE",
                LocalDateTime.of(2024, 1, 15, 8, 30), null,
                10, "TAP_SU", false,
                892L, 1L
        );

        AbuseFlag flag = AbuseFlag.builder()
                .id(1L)
                .user(regularUser)
                .flagType("MASS_REPORTS")
                .severity("HIGH")
                .status("OPEN")
                .reason("Gửi hơn 800 báo cáo trùng lặp")
                .createdAt(LocalDateTime.now())
                .build();

        when(adminUserRepository.findUserDetail(631L)).thenReturn(Optional.of(row));
        when(abuseFlagRepository.findByUserIdOrderByCreatedAtDesc(631L)).thenReturn(List.of(flag));

        AdminUserDetailResponse detail = service.getUserDetail(631L);

        assertThat(detail).isNotNull();
        assertThat(detail.getUserCode()).isEqualTo("U-00631");
        assertThat(detail.isFlagged()).isTrue();
        assertThat(detail.getAbuseFlags()).hasSize(1);
        assertThat(detail.getAbuseFlags().get(0).getFlagType()).isEqualTo("MASS_REPORTS");
    }

    @Test
    @DisplayName("getUserDetail throws ResourceNotFoundException if user does not exist")
    void getUserDetail_NotFound_ThrowsException() {
        when(adminUserRepository.findUserDetail(9999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getUserDetail(9999L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("9999");
    }

    @Test
    @DisplayName("updateUserRole changes role and records audit log")
    void updateUserRole_Success() {
        when(userRepository.findById(722L)).thenReturn(Optional.of(regularUser));
        when(roleRepository.findByName("MODERATOR")).thenReturn(Optional.of(modRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserRow updatedRow = new UserRow(
                722L, "Trần Thị Bình Hà", "tranbinh.ha@outlook.com", "0900000722",
                "MODERATOR", "ACTIVE",
                LocalDateTime.of(2023, 7, 10, 10, 0), null,
                50, "DONG", true,
                47L, 0L
        );
        when(adminUserRepository.findUserDetail(722L)).thenReturn(Optional.of(updatedRow));

        AdminUpdateRoleRequest request = new AdminUpdateRoleRequest("MODERATOR");
        AdminUserItemResponse result = service.updateUserRole(722L, request, "hvanE.admin@scamshield.gov.vn");

        assertThat(result.getRole()).isEqualTo("MODERATOR");
        assertThat(result.getRoleLabel()).isEqualTo("Kiểm duyệt viên");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("updateUserRole prevents admin self-demotion")
    void updateUserRole_SelfDemotion_ThrowsBadRequestException() {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));
        when(roleRepository.findByName("MODERATOR")).thenReturn(Optional.of(modRole));

        AdminUpdateRoleRequest request = new AdminUpdateRoleRequest("MODERATOR");

        assertThatThrownBy(() -> service.updateUserRole(99L, request, "hvanE.admin@scamshield.gov.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bạn không thể tự hạ cấp vai trò Quản trị viên");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserStatus changes status and records audit log")
    void updateUserStatus_Success() {
        when(userRepository.findById(722L)).thenReturn(Optional.of(regularUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserRow updatedRow = new UserRow(
                722L, "Trần Thị Bình Hà", "tranbinh.ha@outlook.com", "0900000722",
                "REGISTERED_USER", "SUSPENDED",
                LocalDateTime.of(2023, 7, 10, 10, 0), null,
                50, "DONG", true,
                47L, 0L
        );
        when(adminUserRepository.findUserDetail(722L)).thenReturn(Optional.of(updatedRow));

        AdminUpdateStatusRequest request = new AdminUpdateStatusRequest("SUSPENDED", "Tạm khóa kiểm tra hành vi");
        AdminUserItemResponse result = service.updateUserStatus(722L, request, "hvanE.admin@scamshield.gov.vn");

        assertThat(result.getStatus()).isEqualTo("SUSPENDED");
        assertThat(result.getStatusLabel()).isEqualTo("Tạm khóa");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("updateUserStatus prevents admin self-lockout")
    void updateUserStatus_SelfLockout_ThrowsBadRequestException() {
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        AdminUpdateStatusRequest request = new AdminUpdateStatusRequest("SUSPENDED", "Tự khóa tài khoản");

        assertThatThrownBy(() -> service.updateUserStatus(99L, request, "hvanE.admin@scamshield.gov.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản");

        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateUserStatus throws exception for invalid status")
    void updateUserStatus_InvalidStatus_ThrowsException() {
        when(userRepository.findById(722L)).thenReturn(Optional.of(regularUser));

        AdminUpdateStatusRequest request = new AdminUpdateStatusRequest("DELETED_FOREVER", "Xóa vĩnh viễn");

        assertThatThrownBy(() -> service.updateUserStatus(722L, request, "hvanE.admin@scamshield.gov.vn"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Trạng thái không hợp lệ");
    }

    @Test
    @DisplayName("createAbuseFlag persists flag and records audit log")
    void createAbuseFlag_Success() {
        when(userRepository.findById(722L)).thenReturn(Optional.of(regularUser));
        when(abuseFlagRepository.save(any(AbuseFlag.class))).thenAnswer(invocation -> {
            AbuseFlag flag = invocation.getArgument(0);
            flag.setId(5L);
            return flag;
        });

        AdminCreateFlagRequest request = new AdminCreateFlagRequest(
                "SPAM_REPORTS", "HIGH", "Gửi báo cáo rác liên tục", "50 reports / phút"
        );

        AdminAbuseFlagResponse response = service.createAbuseFlag(722L, request, "hvanE.admin@scamshield.gov.vn");

        assertThat(response.getId()).isEqualTo(5L);
        assertThat(response.getFlagType()).isEqualTo("SPAM_REPORTS");
        assertThat(response.getStatus()).isEqualTo("OPEN");
        verify(abuseFlagRepository).save(any(AbuseFlag.class));
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    @DisplayName("resolveAbuseFlag resolves flag when user matches")
    void resolveAbuseFlag_Success() {
        AbuseFlag flag = AbuseFlag.builder()
                .id(10L)
                .user(regularUser)
                .flagType("RATE_LIMIT")
                .status("OPEN")
                .build();

        when(abuseFlagRepository.findById(10L)).thenReturn(Optional.of(flag));
        when(abuseFlagRepository.save(any(AbuseFlag.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminAbuseFlagResponse response = service.resolveAbuseFlag(722L, 10L, "hvanE.admin@scamshield.gov.vn");

        assertThat(response.getStatus()).isEqualTo("RESOLVED");
        assertThat(response.getResolvedAt()).isNotNull();
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "DISMISSED", "RESOLVED"})
    void resolveAbuseFlag_RejectsFlagsThatAreNotOpen(String status) {
        AbuseFlag flag = AbuseFlag.builder().id(10L).user(regularUser).status(status).build();
        when(abuseFlagRepository.findById(10L)).thenReturn(Optional.of(flag));
        assertThatThrownBy(() -> service.resolveAbuseFlag(722L, 10L, "hvanE.admin@scamshield.gov.vn"))
                .isInstanceOf(BadRequestException.class);
        assertThat(flag.getStatus()).isEqualTo(status);
        verify(abuseFlagRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    @DisplayName("updateUserRole propagates exception when audit log save fails")
    void updateUserRole_AuditLogFailure_PropagatesException() {
        when(userRepository.findById(722L)).thenReturn(Optional.of(regularUser));
        when(roleRepository.findByName("MODERATOR")).thenReturn(Optional.of(modRole));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        doThrow(new RuntimeException("Database error during audit save"))
                .when(auditLogRepository).save(any(AuditLog.class));

        AdminUpdateRoleRequest request = new AdminUpdateRoleRequest("MODERATOR");

        assertThatThrownBy(() -> service.updateUserRole(722L, request, "hvanE.admin@scamshield.gov.vn"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Database error during audit save");
    }

    @Test
    @DisplayName("getAvailableRoles returns 4 system roles")
    void getAvailableRoles_ReturnsRoles() {
        List<AdminRoleOptionResponse> roles = service.getAvailableRoles();
        assertThat(roles).hasSize(4);
        assertThat(roles.stream().map(AdminRoleOptionResponse::getName))
                .containsExactlyInAnyOrder("REGISTERED_USER", "MODERATOR", "BUSINESS_PARTNER", "ADMINISTRATOR");
    }
}
