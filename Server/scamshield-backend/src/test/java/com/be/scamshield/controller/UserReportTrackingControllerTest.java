package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.service.IOwnReportService;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.*;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IUserReportTrackingService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import org.mockito.ArgumentCaptor;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import org.springframework.http.MediaType;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserReportTrackingController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class UserReportTrackingControllerTest {
    @MockitoBean private IOwnReportService ownReportService;

    private static final String BASE_URL = "/api/user/reports";

    @MockitoBean
    private IUserReportTrackingService reportTrackingService;

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
    void ownerCanWithdrawReport() throws Exception {
        mvc.perform(delete(BASE_URL + "/41").with(authentication(auth)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true));
        verify(ownReportService).withdraw(eq(41L), any(UserPrincipal.class));
    }

    @Test
    void ownerCanUpdateReport() throws Exception {
        mvc.perform(put(BASE_URL + "/41").with(authentication(auth)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"Thông tin bổ sung cho báo cáo\"}"))
                .andExpect(status().isOk());
        verify(ownReportService).update(eq(41L), any(), any(UserPrincipal.class));
    }

    @Test
    void updateRejectsEmptyDescriptionAndInvalidEvidenceBeforeCallingService() throws Exception {
        mvc.perform(put(BASE_URL + "/41").with(authentication(auth)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"description\":\"\",\"evidences\":[{\"fileUrl\":\"\"}]}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(ownReportService);
    }

    @Test
    void anonymousCannotEditOrWithdraw() throws Exception {
        mvc.perform(delete(BASE_URL + "/41")).andExpect(status().isUnauthorized());
        mvc.perform(put(BASE_URL + "/41").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(ownReportService);
    }

    @Test
    void rejectsSortingByRemovedPriorityScore() throws Exception {
        mvc.perform(get(BASE_URL + "/tracking").param("sort", "priorityScore,desc")
                        .with(authentication(auth)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getSummaryMetricsReturnsValidMetrics() throws Exception {
        ReportSummaryMetricsResponse metrics = ReportSummaryMetricsResponse.builder()
                .totalReports(18L)
                .recentReports7Days(4L)
                .blacklistedCount(14L)
                .queriesProtected(3200L)
                .accuracyRate(93.3)
                .rankTitle("A+ Chuyên Gia")
                .reputationPoints(700)
                .currentTierProgress(600)
                .maxTierPoints(700)
                .build();

        when(reportTrackingService.getSummaryMetrics(1L)).thenReturn(metrics);

        mvc.perform(get(BASE_URL + "/metrics").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.totalReports").value(18))
                .andExpect(jsonPath("$.data.recentReports7Days").value(4))
                .andExpect(jsonPath("$.data.blacklistedCount").value(14))
                .andExpect(jsonPath("$.data.queriesProtected").value(3200))
                .andExpect(jsonPath("$.data.accuracyRate").value(93.3))
                .andExpect(jsonPath("$.data.rankTitle").value("A+ Chuyên Gia"))
                .andExpect(jsonPath("$.data.reputationPoints").value(700));
    }

    @Test
    void getStatusCountsReturnsValidCounts() throws Exception {
        ReportStatusCountsResponse counts = ReportStatusCountsResponse.builder()
                .all(18L)
                .pending(3L)
                .approvedBlacklist(14L)
                .mergedDuplicate(1L)
                .rejected(0L)
                .build();

        when(reportTrackingService.getStatusCounts(1L)).thenReturn(counts);

        mvc.perform(get(BASE_URL + "/status-counts").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.all").value(18))
                .andExpect(jsonPath("$.data.pending").value(3))
                .andExpect(jsonPath("$.data.approvedBlacklist").value(14))
                .andExpect(jsonPath("$.data.mergedDuplicate").value(1))
                .andExpect(jsonPath("$.data.rejected").value(0));
    }

    @Test
    void getTrackingReportsReturnsPaginatedList() throws Exception {
        TrackingReportResponse item = TrackingReportResponse.builder()
                .id("#RPT-8492")
                .rawId(8492L)
                .hashId("e9b4...2a1f")
                .targetType("PHONE")
                .targetValue("089.842.xxxx")
                .targetSub("Đầu số MobiFone phát tán")
                .category("Mạo danh cán bộ thuế/A05")
                .submittedDate("14:22, 28/10/2024")
                .slaTime("Xong trong 14 phút")
                .slaStatus("completed")
                .evidenceBadge("3 ảnh • OCR Pass")
                .evidenceCount(3)
                .status("APPROVED_BLACKLIST")
                .build();

        PaginatedResponse<TrackingReportResponse> paginated = new PaginatedResponse<>();
        paginated.setData(List.of(item));
        paginated.setCurrentPage(0);
        paginated.setPageSize(10);
        paginated.setTotalItems(1);
        paginated.setTotalPages(1);

        when(reportTrackingService.getTrackingReports(eq(1L), any(), any(), any(), any(), any()))
                .thenReturn(paginated);

        mvc.perform(get(BASE_URL + "/tracking")
                        .with(authentication(auth))
                        .param("page", "0")
                        .param("size", "10")
                        .param("status", "ALL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].id").value("#RPT-8492"))
                .andExpect(jsonPath("$.data.data[0].targetValue").value("089.842.xxxx"))
                .andExpect(jsonPath("$.data.data[0].slaTime").value("Xong trong 14 phút"))
                .andExpect(jsonPath("$.data.data[0].status").value("APPROVED_BLACKLIST"));
    }

    @Test
    void exportCsvReturnsProperCsvHeadersAndFile() throws Exception {
        byte[] csvBytes = "\"Mã báo cáo\",\"Mã băm (Hash)\"\n\"#RPT-8492\",\"e9b4...2a1f\"".getBytes(StandardCharsets.UTF_8);

        when(reportTrackingService.exportTrackingReportsCsv(eq(1L), any(), any(), any(), any()))
                .thenReturn(csvBytes);

        mvc.perform(get(BASE_URL + "/export-csv").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"scamshield_report_tracking.csv\""))
                .andExpect(content().contentType("text/csv; charset=UTF-8"))
                .andExpect(content().bytes(csvBytes));
    }

    @Test
    void getCategoriesReturnsList() throws Exception {
        ScamCategoryResponse cat = ScamCategoryResponse.builder()
                .id(1L)
                .code("IMPERSONATION")
                .name("Mạo danh cán bộ")
                .build();

        when(reportTrackingService.getCategories()).thenReturn(List.of(cat));

        mvc.perform(get(BASE_URL + "/categories").with(authentication(auth)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data[0].code").value("IMPERSONATION"));
    }

    @Test
    void getTrackingReportsRejectsNegativePageWithBadRequest() throws Exception {
        mvc.perform(get(BASE_URL + "/tracking")
                        .with(authentication(auth))
                        .param("page", "-1"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getTrackingReportsRejectsZeroOrNegativeSizeWithBadRequest() throws Exception {
        mvc.perform(get(BASE_URL + "/tracking")
                        .with(authentication(auth))
                        .param("size", "0"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getTrackingReportsRejectsUnsupportedSortFieldWithBadRequest() throws Exception {
        mvc.perform(get(BASE_URL + "/tracking")
                        .with(authentication(auth))
                        .param("sort", "unsupportedProperty,desc"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getTrackingReportsCapsPageSizeAt100() throws Exception {
        ArgumentCaptor<org.springframework.data.domain.Pageable> pageableCaptor =
                ArgumentCaptor.forClass(org.springframework.data.domain.Pageable.class);

        when(reportTrackingService.getTrackingReports(eq(1L), any(), any(), any(), any(), pageableCaptor.capture()))
                .thenReturn(new PaginatedResponse<>());

        mvc.perform(get(BASE_URL + "/tracking")
                        .with(authentication(auth))
                        .param("size", "200"))
                .andExpect(status().isOk());

        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
    }
}
