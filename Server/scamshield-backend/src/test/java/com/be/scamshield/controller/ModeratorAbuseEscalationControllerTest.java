package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.constant.AbuseFlagType;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.CreateAbuseEscalationRequest;
import com.be.scamshield.dto.request.ModeratorAbuseEscalationFilterRequest;
import com.be.scamshield.dto.response.ModeratorAbuseEscalationResponse;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.be.scamshield.service.IModeratorAbuseEscalationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.LongStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ModeratorAbuseEscalationController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class ModeratorAbuseEscalationControllerTest {

    private static final String URL = "/api/moderator/users/842/abuse-escalations";

    @Autowired private MockMvc mvc;
    @MockitoBean private IModeratorAbuseEscalationService service;
    @MockitoBean private JwtTokenProvider tokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    @Test
    void createsPendingEscalationUsingAuthenticatedModerator() throws Exception {
        UserPrincipal principal = moderatorPrincipal();
        when(service.createEscalation(eq(842L), any(), eq(principal))).thenReturn(
                ModeratorAbuseEscalationResponse.builder().id(41L).userId(842L)
                        .status(AbuseFlagStatus.PENDING).createdByUserId(99L)
                        .reportIds(List.of(10L, 11L)).build());
        Map<String, Object> request = validBody();
        request.put("status", "OPEN");
        request.put("createdByUserId", 12345);
        mvc.perform(post(URL).with(user(principal)).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.createdByUserId").value(99))
                .andExpect(jsonPath("$.data.reportIds[1]").value(11));
        ArgumentCaptor<CreateAbuseEscalationRequest> captured = ArgumentCaptor.forClass(CreateAbuseEscalationRequest.class);
        verify(service).createEscalation(eq(842L), captured.capture(), eq(principal));
        assertThat(captured.getValue().getFlagType()).isEqualTo(AbuseFlagType.BULK_REPORTING);
        assertThat(captured.getValue().getReportIds()).containsExactly(10L, 11L);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BULK_REPORTING", "REPEATED_UNFOUNDED_REPORTING", "OTHER"})
    void acceptsEveryFlagTypeAsEnumFromJson(String flagType) throws Exception {
        when(service.createEscalation(eq(842L), any(), any())).thenAnswer(invocation -> {
            CreateAbuseEscalationRequest request = invocation.getArgument(1);
            return ModeratorAbuseEscalationResponse.builder().flagType(request.getFlagType().name())
                    .status(AbuseFlagStatus.PENDING).build();
        });
        Map<String, Object> request = validBody();
        request.put("flagType", flagType);
        mvc.perform(post(URL).with(user(moderatorPrincipal())).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.flagType").value(flagType));
    }

    @ParameterizedTest
    @MethodSource("invalidCreateFields")
    void rejectsInvalidCreateBody(String field, Object value) throws Exception {
        Map<String, Object> request = validBody();
        request.put(field, value);
        mvc.perform(post(URL).with(user(moderatorPrincipal())).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    static Stream<Arguments> invalidCreateFields() {
        return Stream.of(
                Arguments.of("flagType", null), Arguments.of("flagType", "UNKNOWN"),
                Arguments.of("reason", null), Arguments.of("reason", " ".repeat(25)),
                Arguments.of("reason", "short"), Arguments.of("reason", "x".repeat(2001)),
                Arguments.of("evidence", "x".repeat(5001)),
                Arguments.of("reportIds", null), Arguments.of("reportIds", List.of()),
                Arguments.of("reportIds", Collections.singletonList(null)),
                Arguments.of("reportIds", List.of(-1L)), Arguments.of("reportIds", List.of(0L)),
                Arguments.of("reportIds", LongStream.rangeClosed(1, 51).boxed().toList()));
    }

    @Test
    void duplicatePendingCaseReturnsConflict() throws Exception {
        when(service.createEscalation(eq(842L), any(), any()))
                .thenThrow(new AbuseEscalationConflictException("Tài khoản đã có hồ sơ chờ duyệt"));
        mvc.perform(post(URL).with(user(moderatorPrincipal())).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(validBody())))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void createRequiresAuthenticationAndJsonBody() throws Exception {
        mvc.perform(post(URL).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(validBody())))
                .andExpect(status().isUnauthorized());
        mvc.perform(post(URL).with(user(moderatorPrincipal())).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"REGISTERED_USER", "BUSINESS_PARTNER", "ADMINISTRATOR", "GUEST"})
    void nonModeratorsCannotCreateEscalations(String role) throws Exception {
        mvc.perform(post(URL).with(user("other").roles(role)).contentType(MediaType.APPLICATION_JSON)
                        .content(new ObjectMapper().writeValueAsString(validBody())))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }

    private static UserPrincipal moderatorPrincipal() {
        return UserPrincipal.builder().id(99L).username("moderator@example.test").role("MODERATOR")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_MODERATOR"))).build();
    }

    private static Map<String, Object> validBody() {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("flagType", "BULK_REPORTING");
        request.put("reason", "Tài khoản gửi nhiều báo cáo thiếu căn cứ");
        request.put("reportIds", List.of(10L, 11L));
        return request;
    }

    @Test
    void moderatorReceivesPaginatedHistoryWithDefaults() throws Exception {
        ModeratorAbuseEscalationResponse item = ModeratorAbuseEscalationResponse.builder()
                .id(41L).escalationCode("ESC-0041").userId(842L).reportId(10281L)
                .flagType("BULK_REPORTING").severity("HIGH").reason("Gửi báo cáo hàng loạt")
                .evidence("Đối chiếu các báo cáo liên quan").status(AbuseFlagStatus.PENDING)
                .createdAt(LocalDateTime.of(2026, 10, 28, 9, 0)).build();
        when(service.getEscalations(eq(842L), any())).thenReturn(
                new PaginatedResponse<>(List.of(item), 0, 1, 1, 20, false, false));

        mvc.perform(get(URL).with(user("moderator").roles("MODERATOR")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.data[0].id").value(41))
                .andExpect(jsonPath("$.data.data[0].escalationCode").value("ESC-0041"))
                .andExpect(jsonPath("$.data.data[0].userId").value(842))
                .andExpect(jsonPath("$.data.data[0].reportId").value(10281))
                .andExpect(jsonPath("$.data.data[0].status").value("PENDING"))
                .andExpect(jsonPath("$.data.data[0].user").doesNotExist())
                .andExpect(jsonPath("$.data.data[0].passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.totalItems").value(1))
                .andExpect(jsonPath("$.data.currentPage").value(0))
                .andExpect(jsonPath("$.data.pageSize").value(20));

        ArgumentCaptor<ModeratorAbuseEscalationFilterRequest> filter =
                ArgumentCaptor.forClass(ModeratorAbuseEscalationFilterRequest.class);
        verify(service).getEscalations(eq(842L), filter.capture());
        assertThat(filter.getValue().getPage()).isZero();
        assertThat(filter.getValue().getSize()).isEqualTo(20);
        assertThat(filter.getValue().getStatus()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"PENDING", "DISMISSED", "OPEN"})
    void forwardsSupportedStatusAndPagination(String filterStatus) throws Exception {
        when(service.getEscalations(eq(842L), any())).thenReturn(
                new PaginatedResponse<>(List.of(), 2, 0, 0, 10, false, true));

        mvc.perform(get(URL).with(user("moderator").roles("MODERATOR"))
                        .param("status", filterStatus).param("page", "2").param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data").isEmpty());

        ArgumentCaptor<ModeratorAbuseEscalationFilterRequest> filter =
                ArgumentCaptor.forClass(ModeratorAbuseEscalationFilterRequest.class);
        verify(service).getEscalations(eq(842L), filter.capture());
        assertThat(filter.getValue().getStatus()).isEqualTo(filterStatus);
        assertThat(filter.getValue().getPage()).isEqualTo(2);
        assertThat(filter.getValue().getSize()).isEqualTo(10);
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "page,abc", "size,0", "size,101", "size,abc", "status,RESOLVED", "status,UNKNOWN"})
    void rejectsInvalidQueryParameters(String name, String value) throws Exception {
        mvc.perform(get(URL).with(user("moderator").roles("MODERATOR")).param(name, value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    @Test
    void rejectsNonNumericUserId() throws Exception {
        mvc.perform(get("/api/moderator/users/abc/abuse-escalations")
                        .with(user("moderator").roles("MODERATOR")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    @Test
    void returnsNotFoundForMissingAccount() throws Exception {
        when(service.getEscalations(eq(842L), any()))
                .thenThrow(new ResourceNotFoundException("Không tìm thấy tài khoản với ID: 842"));
        mvc.perform(get(URL).with(user("moderator").roles("MODERATOR")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void returnsBadRequestForNonPositiveUserId() throws Exception {
        when(service.getEscalations(eq(0L), any()))
                .thenThrow(new BadRequestException("ID tài khoản phải là số nguyên dương"));
        mvc.perform(get("/api/moderator/users/0/abuse-escalations")
                        .with(user("moderator").roles("MODERATOR")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void requiresAuthentication() throws Exception {
        mvc.perform(get(URL)).andExpect(status().isUnauthorized());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"REGISTERED_USER", "BUSINESS_PARTNER", "GUEST", "ADMINISTRATOR"})
    void rejectsNonModeratorRoles(String role) throws Exception {
        mvc.perform(get(URL).with(user("other").roles(role)))
                .andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
}
