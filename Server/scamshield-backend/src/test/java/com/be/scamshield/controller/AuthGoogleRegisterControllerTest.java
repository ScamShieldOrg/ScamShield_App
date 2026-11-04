package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.AuthResponse;
import com.be.scamshield.dto.request.RegisterGoogleRequest;
import com.be.scamshield.exception.RegistrationConflictException;
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
class AuthGoogleRegisterControllerTest {

    private static final String REGISTER_GOOGLE_URL = "/api/auth/register/google";

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
    void registerGoogle_Success_WithVerificationToken() throws Exception {
        RegisterGoogleRequest request = RegisterGoogleRequest.builder()
                .idToken("valid_google_id_token")
                .phoneNumber("0912345678")
                .verificationToken("1234567890123456789012345678901234567890123")
                .agreeTerms(true)
                .receiveAlerts(true)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock_registered_access_token")
                .build();

        when(authService.registerGoogle(any(RegisterGoogleRequest.class), any())).thenReturn(authResponse);

        mockMvc.perform(post(REGISTER_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("Google Registration successful"))
                .andExpect(jsonPath("$.data.accessToken").value("mock_registered_access_token"));
    }

    @Test
    void registerGoogle_Success_WithPhoneOtp() throws Exception {
        RegisterGoogleRequest request = RegisterGoogleRequest.builder()
                .idToken("valid_google_id_token")
                .phoneNumber("0912345678")
                .phoneOtp("123456")
                .agreeTerms(true)
                .receiveAlerts(false)
                .build();

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mock_registered_access_token")
                .build();

        when(authService.registerGoogle(any(RegisterGoogleRequest.class), any())).thenReturn(authResponse);

        mockMvc.perform(post(REGISTER_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock_registered_access_token"));
    }

    @Test
    void registerGoogle_BlankFields_ReturnsBadRequest() throws Exception {
        RegisterGoogleRequest request = RegisterGoogleRequest.builder()
                .idToken("")
                .phoneNumber("invalid-phone")
                .agreeTerms(false)
                .build();

        mockMvc.perform(post(REGISTER_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void registerGoogle_Conflict_ReturnsConflict() throws Exception {
        RegisterGoogleRequest request = RegisterGoogleRequest.builder()
                .idToken("valid_google_id_token")
                .phoneNumber("0912345678")
                .phoneOtp("123456")
                .agreeTerms(true)
                .build();

        when(authService.registerGoogle(any(RegisterGoogleRequest.class), any()))
                .thenThrow(new RegistrationConflictException("Số điện thoại đã được dùng cho một tài khoản"));

        mockMvc.perform(post(REGISTER_GOOGLE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.message").value("Số điện thoại đã được dùng cho một tài khoản"));
    }
}
