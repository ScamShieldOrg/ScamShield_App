package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.ScamCheckHistoryItemResponse;
import com.be.scamshield.dto.response.ScamCheckHistoryResponse;
import com.be.scamshield.dto.response.ScamCheckRiskCountsResponse;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IScamCheckHistoryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ScamCheckHistoryController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class ScamCheckHistoryControllerTest {

    private static final String BASE_URL = "/api/scam-check/history";

    @MockitoBean
    private IScamCheckHistoryService scamCheckHistoryService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mvc;

    private UsernamePasswordAuthenticationToken auth;

    @BeforeEach
    void setUp() {
        UserPrincipal userPrincipal = UserPrincipal.builder()
                .id(1L)
                .username("tuananh@example.com")
                .email("tuananh@example.com")
                .role("REGISTERED_USER")
                .build();

        auth = new UsernamePasswordAuthenticationToken(userPrincipal, null, userPrincipal.getAuthorities());
    }

    @Test
    void getCheckHistoryReturnsValidData() throws Exception {
        ScamCheckHistoryItemResponse item = ScamCheckHistoryItemResponse.builder()
                .id("1")
                .timestamp("12/05/2025 • 14:28:11")
                .createdAt(LocalDateTime.of(2025, 5, 12, 14, 28, 11))
                .ip("14.161.***.*** (Viettel HN)")
                .isRetroactive(true)
                .targetType("PHONE")
                .targetValue("+84 912.443.882")
                .snippet("\"Thông báo thuê bao sẽ bị khóa chiều sau 2 giờ do vi phạm quy định viễn thông...\"")
                .category("Giả Mạo Viễn Thông")
                .verdictLabel("Lừa Đảo Nguy Cơ Cao")
                .verdictStatus("DANGEROUS")
                .riskScore(98)
                .build();

        PaginatedResponse<ScamCheckHistoryItemResponse> paginated = new PaginatedResponse<>();
        paginated.setData(List.of(item));
        paginated.setCurrentPage(0);
        paginated.setPageSize(10);
        paginated.setTotalItems(38);
        paginated.setTotalPages(4);
        paginated.setHasNext(true);
        paginated.setHasPrevious(false);

        ScamCheckRiskCountsResponse riskCounts = ScamCheckRiskCountsResponse.builder()
                .all(38)
                .dangerous(14)
                .suspicious(9)
                .safe(11)
                .unknown(4)
                .build();

        ScamCheckHistoryResponse response = ScamCheckHistoryResponse.builder()
                .items(paginated)
                .riskCounts(riskCounts)
                .periodLabel("trong Tháng 5/2025")
                .build();

        when(scamCheckHistoryService.getCheckHistory(eq(1L), any(), any(), any(), any(), any()))
                .thenReturn(response);

        mvc.perform(get(BASE_URL).with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.items.data[0].id").value("1"))
                .andExpect(jsonPath("$.data.items.data[0].targetValue").value("+84 912.443.882"))
                .andExpect(jsonPath("$.data.items.data[0].verdictStatus").value("DANGEROUS"))
                .andExpect(jsonPath("$.data.items.data[0].riskScore").value(98))
                .andExpect(jsonPath("$.data.riskCounts.all").value(38))
                .andExpect(jsonPath("$.data.riskCounts.dangerous").value(14))
                .andExpect(jsonPath("$.data.riskCounts.suspicious").value(9))
                .andExpect(jsonPath("$.data.riskCounts.safe").value(11))
                .andExpect(jsonPath("$.data.riskCounts.unknown").value(4));
    }

    @Test
    void getHistoryAliasEndpointWorks() throws Exception {
        when(scamCheckHistoryService.getCheckHistory(eq(1L), any(), any(), any(), any(), any()))
                .thenReturn(ScamCheckHistoryResponse.builder().build());

        mvc.perform(get("/api/history").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void getRiskCountsReturnsValidCounts() throws Exception {
        ScamCheckRiskCountsResponse riskCounts = ScamCheckRiskCountsResponse.builder()
                .all(38)
                .dangerous(14)
                .suspicious(9)
                .safe(11)
                .unknown(4)
                .build();

        when(scamCheckHistoryService.getRiskCounts(1L)).thenReturn(riskCounts);

        mvc.perform(get(BASE_URL + "/risk-counts").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.all").value(38))
                .andExpect(jsonPath("$.data.dangerous").value(14))
                .andExpect(jsonPath("$.data.suspicious").value(9))
                .andExpect(jsonPath("$.data.safe").value(11))
                .andExpect(jsonPath("$.data.unknown").value(4));
    }

    @Test
    void deleteHistoryCallsService() throws Exception {
        mvc.perform(delete(BASE_URL)
                        .with(authentication(auth))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[1, 2, 3]"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));

        verify(scamCheckHistoryService).deleteHistoryItems(eq(1L), eq(List.of(1L, 2L, 3L)));
    }

    @Test
    void getCheckHistoryRejectsNegativePage() throws Exception {
        mvc.perform(get(BASE_URL)
                        .with(authentication(auth))
                        .param("page", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getCheckHistoryRejectsZeroSize() throws Exception {
        mvc.perform(get(BASE_URL)
                        .with(authentication(auth))
                        .param("size", "0"))
                .andExpect(status().isBadRequest());
    }
}
