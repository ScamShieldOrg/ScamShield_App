package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IReportService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReportController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class ReportControllerTest {
    @MockitoBean private IReportService reports;
    @MockitoBean private JwtTokenProvider tokenProvider;
    @MockitoBean private CustomUserDetailsService userDetails;
    @Autowired private MockMvc mvc;

    private static final String REQUEST = """
            {"threatType":"PHONE","targetIdentifier":"0912345678","category":"OTHER",
             "description":"Nội dung báo cáo","isConfirmed":true}
            """;

    @Test
    void multipartSelfReportReturnsVietnameseBadRequest() throws Exception {
        when(reports.createReport(any(CreateReportRequest.class), anyList(), any(UserPrincipal.class)))
                .thenThrow(new BadRequestException("Không thể tự báo cáo chính mình."));
        mvc.perform(multipart("/api/reports")
                        .file(new MockMultipartFile("request", "request.json", "application/json", REQUEST.getBytes(StandardCharsets.UTF_8)))
                        .file(new MockMultipartFile("files", "proof.png", "image/png", new byte[]{1, 2, 3}))
                        .with(user(principal())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.message").value("Không thể tự báo cáo chính mình."));
    }

    @Test
    void jsonSelfReportReturnsSameVietnameseBadRequest() throws Exception {
        when(reports.createReport(any(CreateReportRequest.class), isNull(), any(UserPrincipal.class)))
                .thenThrow(new BadRequestException("Không thể tự báo cáo chính mình."));
        mvc.perform(post("/api/reports/json")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(REQUEST)
                        .with(user(principal())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.message").value("Không thể tự báo cáo chính mình."));
    }

    private UserPrincipal principal() {
        return UserPrincipal.builder().id(1L).username("reporter@example.com")
                .authorities(List.of(new SimpleGrantedAuthority("ROLE_REGISTERED_USER"))).build();
    }
}
