package com.be.scamshield.controller;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionCountsResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.ReviewPartnerSubmissionRequest;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerSubmissionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:scamshield-mod-partner-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ModeratorPartnerSubmissionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IPartnerSubmissionService partnerSubmissionService;

    @MockitoBean
    private ScamCheckAiClient scamCheckAiClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private UserPrincipal principal(String role) {
        User account = User.builder()
                .id(20L)
                .fullName("Moderator Sentinel")
                .email("moderator@scamshield.vn")
                .phoneNumber("0988776655")
                .passwordHash("unused")
                .role(Role.builder().name(role).build())
                .status("ACTIVE")
                .build();
        return UserPrincipal.create(account);
    }

    @Test
    @DisplayName("GET /api/moderator/partner-submissions - Moderator lấy danh sách hàng đợi -> 200 OK")
    void getQueue_success() throws Exception {
        PartnerSubmissionResponse item = PartnerSubmissionResponse.builder()
                .id(201L)
                .submissionCode("PAL-0201")
                .submissionType("THREAT_INTEL")
                .title("Tên miền lừa đảo")
                .status("PENDING")
                .build();

        PaginatedResponse<PartnerSubmissionResponse> paginated = new PaginatedResponse<>(
                List.of(item), 0, 1, 1, 10, false, false);

        when(partnerSubmissionService.getModeratorQueue(any(), any())).thenReturn(paginated);

        mockMvc.perform(get("/api/moderator/partner-submissions")
                        .with(user(principal("MODERATOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].id").value(201L));
    }

    @Test
    @DisplayName("GET /api/moderator/partner-submissions/counts - Lấy số lượng theo trạng thái -> 200 OK")
    void getCounts_success() throws Exception {
        PartnerSubmissionCountsResponse counts = PartnerSubmissionCountsResponse.builder()
                .totalCount(15)
                .pendingCount(5)
                .verifiedCount(8)
                .rejectedCount(2)
                .build();

        when(partnerSubmissionService.getQueueCounts()).thenReturn(counts);

        mockMvc.perform(get("/api/moderator/partner-submissions/counts")
                        .with(user(principal("MODERATOR"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.totalCount").value(15))
                .andExpect(jsonPath("$.data.pendingCount").value(5));
    }

    @Test
    @DisplayName("PUT /api/moderator/partner-submissions/{id}/review - Ra quyết định VERIFY -> 200 OK")
    void review_verify_success() throws Exception {
        ReviewPartnerSubmissionRequest request = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Đã xác thực chứng cứ lừa đảo hợp lệ.")
                .build();

        PartnerSubmissionResponse response = PartnerSubmissionResponse.builder()
                .id(201L)
                .status("VERIFIED")
                .indicatorAction("CANDIDATE_CREATED")
                .isConfirmed(true)
                .build();

        when(partnerSubmissionService.reviewSubmission(eq(201L), any(), any())).thenReturn(response);

        mockMvc.perform(put("/api/moderator/partner-submissions/201/review")
                        .with(user(principal("MODERATOR")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("VERIFIED"))
                .andExpect(jsonPath("$.data.isConfirmed").value(true));
    }

    @ParameterizedTest
    @ValueSource(strings = {"REGISTERED_USER", "BUSINESS_PARTNER"})
    @DisplayName("Các role không phải MODERATOR không được duyệt hồ sơ -> 403 Forbidden")
    void nonModerator_cannotAccessModeratorEndpoints(String role) throws Exception {
        mockMvc.perform(get("/api/moderator/partner-submissions")
                        .with(user(principal(role))))
                .andExpect(status().isForbidden());
    }
}
