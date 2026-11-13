package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.serviceImpl.EvidenceAnalysisQueueService;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.dto.response.ModeratorEvidenceResponse;
import com.be.scamshield.dto.response.ModeratorQueueCountsResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorReportService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
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

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({ModeratorReportController.class, ModeratorEvidenceAnalysisController.class})
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class ModeratorReportControllerTest {

    private static final String BASE_URL = "/api/moderator/reports";

    @MockitoBean
    private IModeratorReportService moderatorReportService;

    @MockitoBean private EvidenceAnalysisQueueService evidenceAnalysis;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UsernamePasswordAuthenticationToken moderatorAuth;
    private UsernamePasswordAuthenticationToken userAuth;

    private ModeratorReportResponse mockReportResponse;

    @BeforeEach
    void setUp() {
        UserPrincipal modPrincipal = UserPrincipal.builder()
                .id(1L)
                .username("mod@scamshield.vn")
                .email("mod@scamshield.vn")
                .role("MODERATOR")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_MODERATOR")))
                .build();
        moderatorAuth = new UsernamePasswordAuthenticationToken(modPrincipal, null, modPrincipal.getAuthorities());

        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(2L)
                .username("user@example.com")
                .email("user@example.com")
                .role("REGISTERED_USER")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_REGISTERED_USER")))
                .build();
        userAuth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());

        mockReportResponse = ModeratorReportResponse.builder()
                .id("CS-2024-1891")
                .rawId(1891L)
                .targetIdentifier("0909 123 456")
                .targetType("PHONE")
                .category("Lừa đảo ngân hàng / OTP Phishing")
                .categoryId(5L)
                .reportCount(47)
                .reportedBy("nguyenthanh_vn")
                .reportedAt("15/01 14:32")
                .status("Pending")
                .aiScore(null)
                .aiRiskLevel(null)
                .aiConfidence(null)
                .evidenceCount(1)
                .taxonomies(List.of("Lừa đảo ngân hàng / OTP Phishing"))

                .evidences(List.of(
                        ModeratorEvidenceResponse.builder()
                                .id("ev-1")
                                .rawId(1L)
                                .name("screenshot_1.jpg")
                                .type("image")
                                .url("https://storage.scamshield.vn/evidences/screenshot_1.jpg")
                                .build()
                ))
                .build();
    }

    @Test
    void getReportQueue_WhenAuthenticatedAsModerator_ReturnsSuccess() throws Exception {
        PaginatedResponse<ModeratorReportResponse> page = new PaginatedResponse<>();
        page.setData(List.of(mockReportResponse));
        page.setCurrentPage(0);
        page.setTotalItems(1);
        page.setPageSize(20);
        page.setTotalPages(1);

        when(moderatorReportService.getReportQueue(any(ModeratorReportFilterRequest.class), any(Pageable.class), eq((UserPrincipal) moderatorAuth.getPrincipal())))
                .thenReturn(page);

        mvc.perform(get(BASE_URL)
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].id").value("CS-2024-1891"))
                .andExpect(jsonPath("$.data.data[0].targetIdentifier").value("0909 123 456"))
                .andExpect(jsonPath("$.data.data[0].evidenceCount").value(1))
                .andExpect(jsonPath("$.data.data[0].isLocked").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].priority").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].priorityScore").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].evidenceCompleteness").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].status").value("Pending"))
                .andExpect(jsonPath("$.data.data[0].aiScore").isEmpty())
                .andExpect(jsonPath("$.data.data[0].taxonomies[0]").value("Lừa đảo ngân hàng / OTP Phishing"));
    }

    @Test
    void getReportQueue_WhenSortByRemovedPriorityScore_ReturnsBadRequest() throws Exception {
        mvc.perform(get(BASE_URL)
                        .param("sort", "priorityScore,desc")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getReportQueue_WhenSortByUnsupportedPriorityField_ReturnsBadRequest() throws Exception {
        mvc.perform(get(BASE_URL)
                        .param("sort", "priority,desc")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getReportQueue_WhenPageLessThanZero_ReturnsBadRequest() throws Exception {
        mvc.perform(get(BASE_URL)
                        .param("page", "-1")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getReportQueue_WhenSizeLessThanOne_ReturnsBadRequest() throws Exception {
        mvc.perform(get(BASE_URL)
                        .param("size", "0")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getReportQueue_WhenRoleIsRegularUser_ReturnsForbidden() throws Exception {
        mvc.perform(get(BASE_URL)
                        .with(authentication(userAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getReportQueue_WhenUnauthenticated_ReturnsUnauthorized() throws Exception {
        mvc.perform(get(BASE_URL))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getQueueCounts_WhenModerator_ReturnsCounts() throws Exception {
        ModeratorQueueCountsResponse counts = ModeratorQueueCountsResponse.builder()
                .all(7L)
                .pending(3L)
                .inReview(1L)
                .build();

        when(moderatorReportService.getQueueCounts(eq((UserPrincipal) moderatorAuth.getPrincipal()))).thenReturn(counts);

        mvc.perform(get(BASE_URL + "/counts")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.all").value(7))
                .andExpect(jsonPath("$.data.pending").value(3))
                .andExpect(jsonPath("$.data.inReview").value(1))
                .andExpect(jsonPath("$.data.locked").doesNotExist());
    }

    @Test
    void getReportById_WhenModeratorAndFound_ReturnsSuccess() throws Exception {
        when(moderatorReportService.getReportById(eq(1891L), eq((UserPrincipal) moderatorAuth.getPrincipal()))).thenReturn(mockReportResponse);

        mvc.perform(get(BASE_URL + "/1891")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.id").value("CS-2024-1891"))
                .andExpect(jsonPath("$.data.targetIdentifier").value("0909 123 456"));
    }

    @Test
    void getReportById_WhenNotFound_ReturnsNotFound() throws Exception {
        when(moderatorReportService.getReportById(eq(9999L), any(UserPrincipal.class)))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy hồ sơ báo cáo với ID: 9999"));

        mvc.perform(get(BASE_URL + "/9999")
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void getReportById_WhenRegularUser_ReturnsForbidden() throws Exception {
        mvc.perform(get(BASE_URL + "/1891")
                        .with(authentication(userAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    void getReportById_WhenUnauthenticated_ReturnsUnauthorized() throws Exception {
        mvc.perform(get(BASE_URL + "/1891"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void submitDecision_WhenValid_ReturnsSuccess() throws Exception {
        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Bằng chứng đã được xác minh đối soát đầy đủ và hoàn toàn chính xác")
                .categoryId(1L)
                .build();

        ModeratorReportResponse approvedResponse = ModeratorReportResponse.builder()
                .id("CS-2024-1891")
                .rawId(1891L)
                .status("Approved")
                .build();

        when(moderatorReportService.makeDecision(eq(1891L), any(), any(ModeratorDecisionRequest.class)))
                .thenReturn(approvedResponse);

        mvc.perform(put(BASE_URL + "/1891")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("Approved"));
    }

    @Test
    void submitDecision_WhenReject_ReturnsSuccess() throws Exception {
        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.REJECT)
                .reason("Bằng chứng thiếu tính thuyết phục và không có căn cứ xác thực rõ ràng")
                .build();

        ModeratorReportResponse rejectedResponse = ModeratorReportResponse.builder()
                .id("CS-2024-1891")
                .rawId(1891L)
                .status("Rejected")
                .build();

        when(moderatorReportService.makeDecision(eq(1891L), any(), any(ModeratorDecisionRequest.class)))
                .thenReturn(rejectedResponse);

        mvc.perform(put(BASE_URL + "/1891")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("Rejected"));
    }

    @Test
    void submitDecision_WhenReasonTooShort_ReturnsBadRequest() throws Exception {
        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.REJECT)
                .reason("Quá ngắn")
                .build();

        mvc.perform(put(BASE_URL + "/1891")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitDecision_WhenDecisionNull_ReturnsBadRequest() throws Exception {
        String invalidJson = "{\"reason\": \"Bằng chứng đã được xác minh đối soát đầy đủ và hoàn toàn chính xác\"}";

        mvc.perform(put(BASE_URL + "/1891")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson)
                        .with(authentication(moderatorAuth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submitDecision_WhenRegularUser_ReturnsForbidden() throws Exception {
        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Bằng chứng đã được xác minh đối soát đầy đủ và hoàn toàn chính xác")
                .build();

        mvc.perform(put(BASE_URL + "/1891")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .with(authentication(userAuth)))
                .andExpect(status().isForbidden());
    }

    @Test
    void submitDecision_WhenUnauthenticated_ReturnsUnauthorized() throws Exception {
        ModeratorDecisionRequest request = ModeratorDecisionRequest.builder()
                .decision(ModeratorDecisionRequest.DecisionType.APPROVE)
                .reason("Bằng chứng đã được xác minh đối soát đầy đủ và hoàn toàn chính xác")
                .build();

        mvc.perform(put(BASE_URL + "/1891")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void openingReportCallsPersistentInReviewWithoutSessionHeader() throws Exception {
        mockReportResponse.setStatus("In Review");
        when(moderatorReportService.startReview(eq(1891L), eq((UserPrincipal) moderatorAuth.getPrincipal())))
                .thenReturn(mockReportResponse);
        mvc.perform(post(BASE_URL + "/1891/review").with(authentication(moderatorAuth)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("In Review"));
        mvc.perform(post(BASE_URL + "/1891/review").with(authentication(userAuth)))
                .andExpect(status().isForbidden());
    }
    @Test
    void evidenceAnalysisCanOnlyBeQueuedByModeratorOrAdministrator() throws Exception {
        when(evidenceAnalysis.enqueue(1891L, 4L)).thenReturn(EvidenceAnalysisStatus.PENDING);
        mvc.perform(post(BASE_URL + "/1891/evidence/4/analysis").with(authentication(moderatorAuth)))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.data").value("PENDING"));
        mvc.perform(post(BASE_URL + "/1891/evidence/4/analysis").with(authentication(userAuth)))
                .andExpect(status().isForbidden());
        mvc.perform(post(BASE_URL + "/1891/evidence/4/analysis"))
                .andExpect(status().isUnauthorized());
    }
}
