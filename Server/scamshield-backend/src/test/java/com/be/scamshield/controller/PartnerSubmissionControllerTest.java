package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.SubmitPartnerAlertRequest;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerSubmissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PartnerSubmissionController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
@ActiveProfiles("test")
class PartnerSubmissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IPartnerSubmissionService partnerSubmissionService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UserPrincipal principal(String role) {
        User account = User.builder()
                .id(10L)
                .fullName("Shopee Rep")
                .email("partner@shopee.vn")
                .phoneNumber("0912345678")
                .passwordHash("unused")
                .role(Role.builder().name(role).build())
                .status("ACTIVE")
                .build();
        return UserPrincipal.create(account);
    }

    @Test
    @DisplayName("POST /api/partner/submissions - Đối tác gửi alert bằng JSON thành công -> 201 CREATED")
    void submitJson_success() throws Exception {
        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("THREAT_INTEL")
                .title("Tên miền mạo danh mới")
                .description("Trang web lừa đảo tuyển CTV nạp tiền rút lãi ảo.")
                .indicatorType("WEBSITE")
                .indicatorValue("fake-shopee.cc")
                .build();

        PartnerSubmissionResponse mockResponse = PartnerSubmissionResponse.builder()
                .id(101L)
                .submissionCode("PAL-0101")
                .submissionType("THREAT_INTEL")
                .title("Tên miền mạo danh mới")
                .status("PENDING")
                .createdAt(LocalDateTime.now())
                .build();

        when(partnerSubmissionService.submitAlertOrIntel(any(), any(), any())).thenReturn(mockResponse);

        mockMvc.perform(post("/api/partner/submissions")
                        .with(user(principal("BUSINESS_PARTNER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.id").value(101L))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @DisplayName("GET /api/partner/submissions - Lấy danh sách hồ sơ của đối tác -> 200 OK")
    void getMySubmissions_success() throws Exception {
        PartnerSubmissionResponse item = PartnerSubmissionResponse.builder()
                .id(101L)
                .title("Tên miền mạo danh")
                .status("PENDING")
                .build();

        PaginatedResponse<PartnerSubmissionResponse> paginated = new PaginatedResponse<>(
                List.of(item), 0, 1, 1, 10, false, false);

        when(partnerSubmissionService.getMySubmissions(eq("ALL"), eq(0), eq(10), any()))
                .thenReturn(paginated);

        mockMvc.perform(get("/api/partner/submissions")
                        .with(user(principal("BUSINESS_PARTNER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].id").value(101L));
    }

    @ParameterizedTest
    @ValueSource(strings = {"REGISTERED_USER", "MODERATOR"})
    @DisplayName("Các role khác không có quyền gọi API đối tác -> 403 Forbidden")
    void nonPartner_cannotAccessPartnerEndpoints(String role) throws Exception {
        mockMvc.perform(get("/api/partner/submissions")
                        .with(user(principal(role))))
                .andExpect(status().isForbidden());
    }
}
