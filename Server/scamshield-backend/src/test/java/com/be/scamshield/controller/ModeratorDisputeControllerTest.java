package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.request.DisputeVerdictRequest;
import com.be.scamshield.dto.request.ModeratorDisputeFilterRequest;
import com.be.scamshield.dto.response.ModeratorDisputeQueueResponse;
import com.be.scamshield.dto.response.ModeratorDisputeResponse;
import com.be.scamshield.dto.response.ModeratorEvidenceResponse;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorDisputeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ModeratorDisputeController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class ModeratorDisputeControllerTest {

    private static final String BASE_URL = "/api/moderator/disputes";

    @MockitoBean
    private IModeratorDisputeService moderatorDisputeService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UsernamePasswordAuthenticationToken moderatorAuth;
    private UsernamePasswordAuthenticationToken userAuth;

    private ModeratorDisputeResponse sampleDispute;

    @BeforeEach
    void setUp() {
        UserPrincipal modPrincipal = UserPrincipal.builder()
                .id(2L)
                .username("moderator@scamshield.vn")
                .email("moderator@scamshield.vn")
                .role("MODERATOR")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")))
                .build();
        moderatorAuth = new UsernamePasswordAuthenticationToken(modPrincipal, null, modPrincipal.getAuthorities());

        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(10L)
                .username("user@example.com")
                .email("user@example.com")
                .role("REGISTERED_USER")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_REGISTERED_USER")))
                .build();
        userAuth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());

        sampleDispute = ModeratorDisputeResponse.builder()
                .id("AP-2024-0041")
                .rawId(41L)
                .originalReportId("CS-2024-1820")
                .targetIdentifier("0383 456 789")
                .targetType("PHONE")
                .category("Lừa đảo việc làm lương cao")
                .disputedBy("lehoangtung_biz")
                .disputedAt("14/01 16:45")
                .createdAt(LocalDateTime.of(2024, 1, 14, 16, 45))
                .status("Đang xét")
                .statusCode(DisputeStatus.PENDING)
                .originalDecision("Approved")
                .disputeReason("Đây là số điện thoại của công ty tuyển dụng hợp pháp tại Hà Nội...")
                .evidences(List.of(
                        ModeratorEvidenceResponse.builder().id("disp-ev-1").name("business_registration.pdf").type("pdf").build(),
                        ModeratorEvidenceResponse.builder().id("disp-ev-2").name("tax_cert.pdf").type("pdf").build()
                ))
                .evidenceCount(2)
                .build();
    }

    @Test
    @DisplayName("Moderator can get dispute queue list with pending counts matching UI")
    void getDisputes_AsModerator_Success() throws Exception {
        ModeratorDisputeQueueResponse queueResponse = ModeratorDisputeQueueResponse.builder()
                .items(List.of(sampleDispute))
                .pendingCount(2L)
                .totalItems(1L)
                .currentPage(0)
                .pageSize(10)
                .totalPages(1)
                .hasNext(false)
                .hasPrevious(false)
                .build();

        when(moderatorDisputeService.getDisputeQueue(any(ModeratorDisputeFilterRequest.class), any(Pageable.class)))
                .thenReturn(queueResponse);

        mvc.perform(get(BASE_URL).with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.pendingCount").value(2))
                .andExpect(jsonPath("$.data.items[0].id").value("AP-2024-0041"))
                .andExpect(jsonPath("$.data.items[0].originalReportId").value("CS-2024-1820"))
                .andExpect(jsonPath("$.data.items[0].targetIdentifier").value("0383 456 789"))
                .andExpect(jsonPath("$.data.items[0].status").value("Đang xét"))
                .andExpect(jsonPath("$.data.items[0].originalDecision").value("Approved"));
    }

    @Test
    @DisplayName("Non-moderator user is forbidden with 403")
    void getDisputes_AsNormalUser_Forbidden() throws Exception {
        mvc.perform(get(BASE_URL).with(authentication(userAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated caller is denied with 401 Unauthorized")
    void getDisputes_Unauthenticated_Unauthorized() throws Exception {
        mvc.perform(get(BASE_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Moderator can get dispute detail by ID or code")
    void getDisputeById_AsModerator_Success() throws Exception {
        when(moderatorDisputeService.getDisputeById("AP-2024-0041")).thenReturn(sampleDispute);

        mvc.perform(get(BASE_URL + "/AP-2024-0041").with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.id").value("AP-2024-0041"))
                .andExpect(jsonPath("$.data.disputedBy").value("lehoangtung_biz"))
                .andExpect(jsonPath("$.data.evidences.length()").value(2));
    }

    @Test
    @DisplayName("Moderator can submit RETRACT verdict decision successfully")
    void makeDecision_Retract_Success() throws Exception {
        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("RETRACT")
                .reason("Bằng chứng giấy phép kinh doanh và chứng từ thuế hợp lệ, xác minh số tổng đài chính thức.")
                .build();

        ModeratorDisputeResponse updatedDispute = ModeratorDisputeResponse.builder()
                .id("AP-2024-0041")
                .status("Chấp nhận")
                .statusCode(DisputeStatus.APPROVED)
                .resolutionReason(request.getReason())
                .resolvedBy("VCB Security Sentinel")
                .build();

        when(moderatorDisputeService.makeDecision(eq("AP-2024-0041"), any(DisputeVerdictRequest.class), eq("moderator@scamshield.vn")))
                .thenReturn(updatedDispute);

        mvc.perform(put(BASE_URL + "/AP-2024-0041/decision")
                        .with(authentication(moderatorAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("Thu hồi chỉ số lừa đảo thành công"))
                .andExpect(jsonPath("$.data.status").value("Chấp nhận"));
    }

    @Test
    @DisplayName("Moderator can submit UPHOLD verdict decision successfully")
    void makeDecision_Uphold_Success() throws Exception {
        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("UPHOLD")
                .reason("Bằng chứng cung cấp chưa đủ cơ sở chứng minh quyền sở hữu hợp pháp; giữ nguyên quyết định.")
                .build();

        ModeratorDisputeResponse updatedDispute = ModeratorDisputeResponse.builder()
                .id("AP-2024-0041")
                .status("Từ chối")
                .statusCode(DisputeStatus.REJECTED)
                .resolutionReason(request.getReason())
                .resolvedBy("VCB Security Sentinel")
                .build();

        when(moderatorDisputeService.makeDecision(eq("AP-2024-0041"), any(DisputeVerdictRequest.class), eq("moderator@scamshield.vn")))
                .thenReturn(updatedDispute);

        mvc.perform(put(BASE_URL + "/AP-2024-0041")
                        .with(authentication(moderatorAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("Duy trì quyết định gốc, từ chối kháng nghị thành công"))
                .andExpect(jsonPath("$.data.status").value("Từ chối"));
    }

    @Test
    @DisplayName("Validation fails when reason has less than 20 characters")
    void makeDecision_ReasonTooShort_BadRequest() throws Exception {
        DisputeVerdictRequest request = DisputeVerdictRequest.builder()
                .verdict("RETRACT")
                .reason("Quá ngắn")
                .build();

        mvc.perform(put(BASE_URL + "/AP-2024-0041/decision")
                        .with(authentication(moderatorAuth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Moderator evidence download does not fall back to an unauthenticated redirect")
    void downloadEvidence_AsModerator_Success() throws Exception {
        when(moderatorDisputeService.getEvidenceDownloadUrl("AP-2024-0041", 1L))
                .thenReturn("https://storage.example/signed-download");

        mvc.perform(get(BASE_URL + "/AP-2024-0041/evidence/1/download").with(authentication(moderatorAuth)))
                .andExpect(status().isBadGateway());
    }
}
