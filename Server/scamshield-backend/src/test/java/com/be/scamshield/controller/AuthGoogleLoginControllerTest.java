package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.AuthResponse;
import com.be.scamshield.dto.request.LoginGoogleRequest;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.service.IAuthService;
import com.be.scamshield.service.IOtpService;
import com.be.scamshield.serviceImpl.ContactVerificationService;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class AuthGoogleLoginControllerTest {

    private static final String LOGIN_GOOGLE_URL = "/api/auth/login/google";

    @MockitoBean
    private IAuthService authService;

    @MockitoBean
    private IOtpService otpService;

    @MockitoBean
    private ContactVerificationService contactVerificationService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void loginGoogle_Success() throws Exception {
        LoginGoogleRequest request = new LoginGoogleRequest("valid_google_id_token");
        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock_jwt_access_token")
                .build();

        when(authService.loginGoogle(any(LoginGoogleRequest.class), any())).thenReturn(authResponse);

        mockMvc.perform(post(LOGIN_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("Đăng nhập Google thành công"))
                .andExpect(jsonPath("$.data.accessToken").value("mock_jwt_access_token"));
    }

    @Test
    void loginGoogle_BlankIdToken_ReturnsBadRequest() throws Exception {
        LoginGoogleRequest request = new LoginGoogleRequest("");

        mockMvc.perform(post(LOGIN_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void loginGoogle_UserNotFound_ReturnsNotFound() throws Exception {
        LoginGoogleRequest request = new LoginGoogleRequest("unregistered_google_id_token");

        when(authService.loginGoogle(any(LoginGoogleRequest.class), any()))
                .thenThrow(new ResourceNotFoundException("Tài khoản chưa được đăng ký trong hệ thống"));

        mockMvc.perform(post(LOGIN_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.message").value("Tài khoản chưa được đăng ký trong hệ thống"));
    }

    @Test
    void loginGoogle_BannedAccount_ReturnsUnauthorized() throws Exception {
        LoginGoogleRequest request = new LoginGoogleRequest("banned_google_id_token");

        when(authService.loginGoogle(any(LoginGoogleRequest.class), any()))
                .thenThrow(new UnauthorizedException("Your account is banned. Please contact support."));

        mockMvc.perform(post(LOGIN_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.message").value("Your account is banned. Please contact support."));
    }
}
