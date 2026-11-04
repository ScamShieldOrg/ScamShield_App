package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.admin.*;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAdminUserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminUserController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class AdminUserControllerTest {

    private static final String BASE_URL = "/api/admin/users";

    @MockitoBean
    private IAdminUserService adminUserService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UsernamePasswordAuthenticationToken adminAuth;
    private UsernamePasswordAuthenticationToken userAuth;
    private UsernamePasswordAuthenticationToken moderatorAuth;

    @BeforeEach
    void setUp() {
        UserPrincipal adminPrincipal = UserPrincipal.builder()
                .id(99L)
                .username("admin@scamshield.gov.vn")
                .email("admin@scamshield.gov.vn")
                .role("ADMINISTRATOR")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR")))
                .build();
        adminAuth = new UsernamePasswordAuthenticationToken(adminPrincipal, null, adminPrincipal.getAuthorities());

        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(1L)
                .username("user@example.com")
                .email("user@example.com")
                .role("REGISTERED_USER")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_REGISTERED_USER")))
                .build();
        userAuth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());

        UserPrincipal modPrincipal = UserPrincipal.builder()
                .id(2L)
                .username("moderator@scamshield.vn")
                .email("moderator@scamshield.vn")
                .role("MODERATOR")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")))
                .build();
        moderatorAuth = new UsernamePasswordAuthenticationToken(modPrincipal, null, modPrincipal.getAuthorities());
    }

    @Test
    @DisplayName("Admin caller can successfully fetch user list with counts and flags")
    void getUsers_AsAdmin_Success() throws Exception {
        AdminUserItemResponse item1 = AdminUserItemResponse.builder()
                .id(41L)
                .userCode("U-00041")
                .fullName("Nguyễn Thanh Hòa")
                .email("nguyenthanhhoa@gmail.com")
                .role("MODERATOR")
                .roleLabel("Kiểm duyệt viên")
                .joinedFormatted("03/2023")
                .reportCount(12)
                .status("ACTIVE")
                .statusLabel("Bình thường")
                .isFlagged(false)
                .isRateLimited(false)
                .build();

        AdminUserItemResponse item2 = AdminUserItemResponse.builder()
                .id(631L)
                .userCode("U-00631")
                .fullName("mass_reporter_03")
                .email("massreport03@proton.me")
                .role("REGISTERED_USER")
                .roleLabel("Người dùng")
                .joinedFormatted("01/2024")
                .reportCount(892)
                .status("ACTIVE")
                .statusLabel("Bình thường")
                .isFlagged(true)
                .isRateLimited(true)
                .flagReasons(List.of("Báo cáo số lượng lớn bất thường (892 báo cáo)"))
                .build();

        AdminUserListResponse listResponse = AdminUserListResponse.builder()
                .items(List.of(item1, item2))
                .totalAccounts(8)
                .flaggedAccountsCount(2)
                .currentPage(1)
                .pageSize(10)
                .totalItems(2)
                .totalPages(1)
                .hasNext(false)
                .hasPrevious(false)
                .build();

        when(adminUserService.getUsers(isNull(), isNull(), isNull(), eq(1), eq(10), eq("createdAt"), eq("desc")))
                .thenReturn(listResponse);

        mvc.perform(get(BASE_URL).with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.totalAccounts").value(8))
                .andExpect(jsonPath("$.data.flaggedAccountsCount").value(2))
                .andExpect(jsonPath("$.data.items[0].userCode").value("U-00041"))
                .andExpect(jsonPath("$.data.items[0].roleLabel").value("Kiểm duyệt viên"))
                .andExpect(jsonPath("$.data.items[1].userCode").value("U-00631"))
                .andExpect(jsonPath("$.data.items[1].isFlagged").value(true))
                .andExpect(jsonPath("$.data.items[1].isRateLimited").value(true));
    }

    @Test
    @DisplayName("Non-admin caller (REGISTERED_USER) is denied with 403 Forbidden")
    void getUsers_AsNormalUser_Forbidden() throws Exception {
        mvc.perform(get(BASE_URL).with(authentication(userAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Moderator caller is denied with 403 Forbidden")
    void getUsers_AsModerator_Forbidden() throws Exception {
        mvc.perform(get(BASE_URL).with(authentication(moderatorAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated caller is denied with 401 Unauthorized or 403 Forbidden")
    void getUsers_Unauthenticated_Denied() throws Exception {
        mvc.perform(get(BASE_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin can fetch available roles list")
    void getAvailableRoles_AsAdmin_Success() throws Exception {
        List<AdminRoleOptionResponse> roles = List.of(
                AdminRoleOptionResponse.builder().name("REGISTERED_USER").label("Người dùng").build(),
                AdminRoleOptionResponse.builder().name("MODERATOR").label("Kiểm duyệt viên").build(),
                AdminRoleOptionResponse.builder().name("BUSINESS_PARTNER").label("Đối tác").build(),
                AdminRoleOptionResponse.builder().name("ADMINISTRATOR").label("Quản trị viên").build()
        );

        when(adminUserService.getAvailableRoles()).thenReturn(roles);

        mvc.perform(get(BASE_URL + "/roles").with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.length()").value(4))
                .andExpect(jsonPath("$.data[0].name").value("REGISTERED_USER"))
                .andExpect(jsonPath("$.data[1].label").value("Kiểm duyệt viên"));
    }

    @Test
    @DisplayName("Admin can fetch single user details")
    void getUserDetail_AsAdmin_Success() throws Exception {
        AdminUserDetailResponse detail = AdminUserDetailResponse.builder()
                .id(41L)
                .userCode("U-00041")
                .fullName("Nguyễn Thanh Hòa")
                .email("nguyenthanhhoa@gmail.com")
                .role("MODERATOR")
                .roleLabel("Kiểm duyệt viên")
                .status("ACTIVE")
                .statusLabel("Bình thường")
                .reputationPoints(120)
                .reputationRank("CHUYEN_GIA")
                .reportCount(12)
                .isFlagged(false)
                .isRateLimited(false)
                .abuseFlags(Collections.emptyList())
                .build();

        when(adminUserService.getUserDetail(41L)).thenReturn(detail);

        mvc.perform(get(BASE_URL + "/41").with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.id").value(41))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Thanh Hòa"))
                .andExpect(jsonPath("$.data.reputationPoints").value(120));
    }

    @Test
    @DisplayName("Admin can update user role")
    void updateUserRole_AsAdmin_Success() throws Exception {
        AdminUpdateRoleRequest request = new AdminUpdateRoleRequest("MODERATOR");

        AdminUserItemResponse updated = AdminUserItemResponse.builder()
                .id(722L)
                .userCode("U-00722")
                .fullName("Trần Thị Bích Hà")
                .email("tranbinh.ha@outlook.com")
                .role("MODERATOR")
                .roleLabel("Kiểm duyệt viên")
                .status("ACTIVE")
                .statusLabel("Bình thường")
                .reportCount(47)
                .build();

        when(adminUserService.updateUserRole(eq(722L), any(AdminUpdateRoleRequest.class), eq("admin@scamshield.gov.vn")))
                .thenReturn(updated);

        mvc.perform(put(BASE_URL + "/722/role")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.role").value("MODERATOR"))
                .andExpect(jsonPath("$.data.roleLabel").value("Kiểm duyệt viên"));

        verify(adminUserService).updateUserRole(eq(722L), any(AdminUpdateRoleRequest.class), eq("admin@scamshield.gov.vn"));
    }

    @Test
    @DisplayName("Non-admin cannot update user role (403 Forbidden)")
    void updateUserRole_AsNormalUser_Forbidden() throws Exception {
        AdminUpdateRoleRequest request = new AdminUpdateRoleRequest("MODERATOR");

        mvc.perform(put(BASE_URL + "/722/role")
                        .with(authentication(userAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin can update user status")
    void updateUserStatus_AsAdmin_Success() throws Exception {
        AdminUpdateStatusRequest request = new AdminUpdateStatusRequest("SUSPENDED", "Spamming suspicious reports");

        AdminUserItemResponse updated = AdminUserItemResponse.builder()
                .id(631L)
                .userCode("U-00631")
                .fullName("mass_reporter_03")
                .email("massreport03@proton.me")
                .role("REGISTERED_USER")
                .roleLabel("Người dùng")
                .status("SUSPENDED")
                .statusLabel("Tạm khóa")
                .isFlagged(true)
                .build();

        when(adminUserService.updateUserStatus(eq(631L), any(AdminUpdateStatusRequest.class), eq("admin@scamshield.gov.vn")))
                .thenReturn(updated);

        mvc.perform(put(BASE_URL + "/631/status")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.data.statusLabel").value("Tạm khóa"));
    }

    @Test
    @DisplayName("Admin can create abuse flag")
    void createAbuseFlag_AsAdmin_Success() throws Exception {
        AdminCreateFlagRequest request = new AdminCreateFlagRequest(
                "REPORT_SPAM",
                "HIGH",
                "Spamming repetitive false reports",
                "Sent 50 reports within 2 minutes"
        );

        AdminAbuseFlagResponse flagResponse = AdminAbuseFlagResponse.builder()
                .id(10L)
                .flagType("REPORT_SPAM")
                .severity("HIGH")
                .status("OPEN")
                .reason("Spamming repetitive false reports")
                .evidence("Sent 50 reports within 2 minutes")
                .createdAt(LocalDateTime.now())
                .build();

        when(adminUserService.createAbuseFlag(eq(631L), any(AdminCreateFlagRequest.class), eq("admin@scamshield.gov.vn")))
                .thenReturn(flagResponse);

        mvc.perform(post(BASE_URL + "/631/flags")
                        .with(authentication(adminAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.flagType").value("REPORT_SPAM"))
                .andExpect(jsonPath("$.data.status").value("OPEN"));
    }

    @Test
    @DisplayName("Admin can resolve abuse flag")
    void resolveAbuseFlag_AsAdmin_Success() throws Exception {
        AdminAbuseFlagResponse resolvedFlag = AdminAbuseFlagResponse.builder()
                .id(10L)
                .flagType("REPORT_SPAM")
                .severity("HIGH")
                .status("RESOLVED")
                .reason("Spamming repetitive false reports")
                .evidence("Sent 50 reports within 2 minutes")
                .resolvedAt(LocalDateTime.now())
                .build();

        when(adminUserService.resolveAbuseFlag(eq(631L), eq(10L), eq("admin@scamshield.gov.vn")))
                .thenReturn(resolvedFlag);

        mvc.perform(patch(BASE_URL + "/631/flags/10/resolve")
                        .with(authentication(adminAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("RESOLVED"));
    }
}
