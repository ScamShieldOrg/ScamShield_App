package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.http.MediaType;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.mockito.ArgumentMatchers.eq;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationFilterRequest;
import com.be.scamshield.dto.admin.AdminAbuseEscalationResponse;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.service.IAdminAbuseEscalationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AdminAbuseEscalationController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class AdminAbuseEscalationControllerTest {

    private static final String URL = "/api/admin/abuse-escalations";

    @Autowired private MockMvc mvc;
    @MockitoBean private IAdminAbuseEscalationService service;
    @MockitoBean private JwtTokenProvider tokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    @ParameterizedTest
    @ValueSource(strings = {"DISMISS", "FLAG", "SUSPEND", "BAN"})
    void administratorCanSubmitDecision(String decision) throws Exception {
        UserPrincipal principal = UserPrincipal.builder().id(99L).username("administrator")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_ADMINISTRATOR"))).build();
        when(service.decideEscalation(eq(41L), any(), any())).thenReturn(
                AdminAbuseEscalationResponse.builder().id(41L).status(AbuseFlagStatus.OPEN).build());
        mvc.perform(put(URL + "/41").with(user(principal)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"" + decision + "\",\"reason\":\"Đã xem xét toàn bộ bằng chứng liên quan.\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.id").value(41));
        verify(service).decideEscalation(eq(41L), any(DecideAbuseEscalationRequest.class), eq(principal));
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"decision\":\"OTHER\",\"reason\":\"Lý do không hợp lệ\"}",
            "{\"decision\":\"BAN\",\"reason\":\"ngắn\"}"})
    void decisionValidatesBody(String body) throws Exception {
        mvc.perform(put(URL + "/41").with(user("admin").roles("ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"MODERATOR", "REGISTERED_USER", "BUSINESS_PARTNER"})
    void otherRolesCannotDecide(String role) throws Exception {
        mvc.perform(put(URL + "/41").with(user("other").roles(role)).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"BAN\",\"reason\":\"Đã xem xét toàn bộ bằng chứng liên quan.\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void anonymousCannotDecide() throws Exception {
        mvc.perform(put(URL + "/41").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void decidedCaseReturnsConflict() throws Exception {
        when(service.decideEscalation(eq(41L), any(), any())).thenThrow(new AbuseEscalationConflictException("Hồ sơ đã xử lý"));
        mvc.perform(put(URL + "/41").with(user("admin").roles("ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"decision\":\"BAN\",\"reason\":\"Đã xem xét toàn bộ bằng chứng liên quan.\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void adminReceivesDetailWithoutExposingEntitiesOrAuditRequestMetadata() throws Exception {
        AdminAbuseEscalationDetailResponse detail = AdminAbuseEscalationDetailResponse.builder()
                .escalation(AdminAbuseEscalationResponse.builder().id(41L).userId(842L)
                        .status(AbuseFlagStatus.PENDING).userStatus("ACTIVE").reportIds(List.of(10L)).build())
                .accountDetails(AdminAbuseEscalationDetailResponse.AccountDetails.builder()
                        .phoneNumber("0912345601").phoneVerified(true).reputationPoints(120).build())
                .activity(AdminAbuseEscalationDetailResponse.ReportActivity.builder().totalReports(2).rejectedReports(1).build())
                .reports(List.of(AdminAbuseEscalationDetailResponse.RelatedReport.builder().id(10L).status("REJECTED")
                        .latestModeration(AdminAbuseEscalationDetailResponse.LatestModeration.builder()
                                .action("REJECT").reason("Chưa đủ căn cứ xác minh").build())
                        .evidences(List.of(AdminAbuseEscalationDetailResponse.Evidence.builder().id(5L).evidenceType("IMAGE").build()))
                        .build()))
                .auditTrail(List.of(AdminAbuseEscalationDetailResponse.AuditEntry.builder()
                        .id(1L).action("CREATE_ABUSE_ESCALATION").build())).build();
        when(service.getEscalationById(41L)).thenReturn(detail);
        mvc.perform(get(URL + "/41").with(user("admin").roles("ADMINISTRATOR")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.escalation.id").value(41))
                .andExpect(jsonPath("$.data.accountDetails.phoneVerified").value(true))
                .andExpect(jsonPath("$.data.activity.totalReports").value(2))
                .andExpect(jsonPath("$.data.reports[0].latestModeration.action").value("REJECT"))
                .andExpect(jsonPath("$.data.reports[0].evidences[0].id").value(5))
                .andExpect(jsonPath("$.data.auditTrail[0].action").value("CREATE_ABUSE_ESCALATION"))
                .andExpect(jsonPath("$.data.accountDetails.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.escalation.user").doesNotExist())
                .andExpect(jsonPath("$.data.reports[0].reporterUser").doesNotExist())
                .andExpect(jsonPath("$.data.auditTrail[0].ipHash").doesNotExist())
                .andExpect(jsonPath("$.data.auditTrail[0].requestId").doesNotExist());
        verify(service).getEscalationById(41L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc", "ESC-0041", "9223372036854775808"})
    void detailRequiresNumericLongId(String id) throws Exception {
        mvc.perform(get(URL + "/" + id).with(user("admin").roles("ADMINISTRATOR")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1})
    void nonPositiveDetailIdReturnsBadRequest(Long id) throws Exception {
        when(service.getEscalationById(id)).thenThrow(new BadRequestException("ID hồ sơ phải là số nguyên dương"));
        mvc.perform(get(URL + "/" + id).with(user("admin").roles("ADMINISTRATOR")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void missingDetailReturnsNotFound() throws Exception {
        when(service.getEscalationById(999L)).thenThrow(new ResourceNotFoundException("Không tìm thấy hồ sơ"));
        mvc.perform(get(URL + "/999").with(user("admin").roles("ADMINISTRATOR")))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void anonymousCannotReadDetail() throws Exception {
        mvc.perform(get(URL + "/41")).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"MODERATOR", "REGISTERED_USER", "BUSINESS_PARTNER", "GUEST"})
    void onlyAdministratorCanReadDetail(String role) throws Exception {
        mvc.perform(get(URL + "/41").with(user("other").roles(role))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    @Test
    void adminReceivesSafePaginatedResponseAndPendingDefaults() throws Exception {
        AdminAbuseEscalationResponse item = AdminAbuseEscalationResponse.builder()
                .id(41L).escalationCode("ESC-0041").userId(842L).userCode("U-00842")
                .fullName("Trần Minh Khôi").email("khoi@example.test").userStatus("ACTIVE")
                .createdByUserId(99L).createdByName("Mai Phương").status(AbuseFlagStatus.PENDING)
                .flagType("BULK_REPORTING").reportIds(List.of(10L, 11L)).build();
        when(service.getEscalations(any())).thenReturn(
                new PaginatedResponse<>(List.of(item), 0, 1, 1, 20, false, false));

        mvc.perform(get(URL).with(user("admin").roles("ADMINISTRATOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].escalationCode").value("ESC-0041"))
                .andExpect(jsonPath("$.data.data[0].userId").value(842))
                .andExpect(jsonPath("$.data.data[0].userStatus").value("ACTIVE"))
                .andExpect(jsonPath("$.data.data[0].createdByName").value("Mai Phương"))
                .andExpect(jsonPath("$.data.data[0].reportIds.length()").value(2))
                .andExpect(jsonPath("$.data.data[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data.data[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].user").doesNotExist())
                .andExpect(jsonPath("$.data.currentPage").value(0))
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(20));

        ArgumentCaptor<AdminAbuseEscalationFilterRequest> filter = ArgumentCaptor.forClass(AdminAbuseEscalationFilterRequest.class);
        verify(service).getEscalations(filter.capture());
        assertThat(filter.getValue().getStatus()).isEqualTo("PENDING");
        assertThat(filter.getValue().getPage()).isZero();
        assertThat(filter.getValue().getSize()).isEqualTo(20);
        assertThat(filter.getValue().getSearch()).isNull();
        assertThat(filter.getValue().getSort()).isEqualTo("createdAt,desc");
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "OPEN", "DISMISSED", "ALL"})
    void acceptsFiltersAndPagination(String filterStatus) throws Exception {
        when(service.getEscalations(any())).thenReturn(new PaginatedResponse<>(List.of(), 1, 0, 0, 10, false, true));
        mvc.perform(get(URL).with(user("admin").roles("ADMINISTRATOR"))
                        .param("status", filterStatus).param("page", "1").param("size", "10").param("search", "ESC-0041"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.data").isEmpty());
        ArgumentCaptor<AdminAbuseEscalationFilterRequest> filter = ArgumentCaptor.forClass(AdminAbuseEscalationFilterRequest.class);
        verify(service).getEscalations(filter.capture());
        assertThat(filter.getValue().getStatus()).isEqualTo(filterStatus);
        assertThat(filter.getValue().getSearch()).isEqualTo("ESC-0041");
        assertThat(filter.getValue().getPage()).isEqualTo(1);
        assertThat(filter.getValue().getSize()).isEqualTo(10);
    }

    @ParameterizedTest
    @ValueSource(strings = {"priority,desc", "priority,asc", "createdAt,asc", "createdAt,desc"})
    void forwardsSupportedSort(String sort) throws Exception {
        when(service.getEscalations(any())).thenReturn(new PaginatedResponse<>(List.of(), 0, 0, 0, 20, false, false));
        mvc.perform(get(URL).with(user("admin").roles("ADMINISTRATOR")).param("sort", sort))
                .andExpect(status().isOk());
        ArgumentCaptor<AdminAbuseEscalationFilterRequest> filter = ArgumentCaptor.forClass(AdminAbuseEscalationFilterRequest.class);
        verify(service).getEscalations(filter.capture());
        assertThat(filter.getValue().getSort()).isEqualTo(sort);
    }

    @ParameterizedTest
    @ValueSource(strings = {"priority,up", "severity,desc", "priority", "priority,desc,id,asc", ""})
    void rejectsUnsupportedSort(String sort) throws Exception {
        mvc.perform(get(URL).with(user("admin").roles("ADMINISTRATOR")).param("sort", sort))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "page,abc", "size,0", "size,101", "size,abc", "status,RESOLVED", "status,UNKNOWN", "status,''"})
    void invalidFiltersReturnBadRequest(String field, String value) throws Exception {
        mvc.perform(get(URL).with(user("admin").roles("ADMINISTRATOR")).param(field, value))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    @Test
    void searchLengthIsBounded() throws Exception {
        mvc.perform(get(URL).with(user("admin").roles("ADMINISTRATOR")).param("search", "x".repeat(101)))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @Test
    void anonymousRequestIsUnauthorized() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"MODERATOR", "REGISTERED_USER", "BUSINESS_PARTNER", "GUEST"})
    void nonAdminCannotReadQueue(String role) throws Exception {
        mvc.perform(get(URL).with(user("other").roles(role))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
