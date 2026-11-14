package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.exception.OtpRateLimitException;
import com.be.scamshield.exception.SmsProviderException;
import com.be.scamshield.service.IAuthService;
import com.be.scamshield.service.PartnerPasswordSetupService;
import com.be.scamshield.service.IOtpService;
import com.be.scamshield.serviceImpl.ContactVerificationService;
import com.be.scamshield.dto.response.ContactVerificationResponse;
import org.springframework.http.MediaType;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.NullSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class SmsOtpControllerTest {
    private static final String PERSONAL_JSON = """
            {"fullName":"Nguyễn Văn An","email":"user@gmail.com","phoneNumber":"0912345678",
             "password":"Example123!","verificationToken":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
             "agreeTerms":true,"receiveAlerts":false}
            """;
    @Autowired
    private MockMvc mvc;
    @MockitoBean
    private IAuthService authService;
    @MockitoBean
    private IOtpService otpService;
    @MockitoBean
    private ContactVerificationService contactVerificationService;

    @MockitoBean
    private PartnerPasswordSetupService partnerPasswordSetupService;
    @MockitoBean
    private JwtTokenProvider tokenProvider;
    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @ParameterizedTest
    @ValueSource(strings = {"điện thoại"})
    void verificationFailureDisplaysTheInvalidOtpChannel(String channel) throws Exception {
        String message = "OTP " + channel + " không hợp lệ: Vui lòng gửi yêu cầu lấy mã OTP mới";
        when(contactVerificationService.verifyContacts(any())).thenThrow(new IllegalArgumentException(message));
        mvc.perform(post("/api/auth/verify-contacts").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"0912345678","phoneOtp":"123456"}
                                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.message").value(message))
                .andExpect(jsonPath("$.data.verificationToken").doesNotExist());
    }

    @Test
    void guestCanVerifyPhoneWithoutEmailThroughTheSharedPublicEndpoint() throws Exception {
        when(contactVerificationService.verifyContacts(any())).thenReturn(
                new ContactVerificationResponse("x".repeat(43), LocalDateTime.of(2026, 10, 6, 10, 0)));
        mvc.perform(post("/api/auth/verify-contacts").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"0912345678","phoneOtp":"123456"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.verificationToken").value("x".repeat(43)))
                .andExpect(jsonPath("$.data.emailOtp").doesNotExist());
        verifyNoInteractions(authService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0912345678", "+84912345678", "+84 912 345 678", "(0912) 345-678", "0391234567"})
    void verificationAcceptsSupportedVietnameseMobileFormats(String phone) throws Exception {
        when(contactVerificationService.verifyContacts(any())).thenReturn(
                new ContactVerificationResponse("x".repeat(43), LocalDateTime.of(2026, 10, 6, 10, 0)));
        mvc.perform(post("/api/auth/verify-contacts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":\"" + phone + "\",\"phoneOtp\":\"123456\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true));
        verify(contactVerificationService).verifyContacts(any());
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "091234567", "09123456789", "0212345678", "+840912345678", "+19123456789", "09abc45678", "19001234"})
    void verificationRejectsInvalidPhoneBeforeCallingService(String phone) throws Exception {
        String phoneJson = phone == null ? "null" : "\"" + phone + "\"";
        mvc.perform(post("/api/auth/verify-contacts").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"phoneNumber\":" + phoneJson + ",\"phoneOtp\":\"123456\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.data.phoneNumber").exists());
        verifyNoInteractions(contactVerificationService);
    }

    @Test
    void verificationValidatesPhoneAndPhoneOtpOnly() throws Exception {
        mvc.perform(post("/api/auth/verify-contacts").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"phoneNumber":"","phoneOtp":""}
                                """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.data.phoneNumber").exists()).andExpect(jsonPath("$.data.phoneOtp").exists());
        verifyNoInteractions(contactVerificationService);
    }

    @Test
    void personalRegistrationAcceptsPhoneVerificationTokenWithoutOtp() throws Exception {
        mvc.perform(post("/api/auth/register/personal").contentType(MediaType.APPLICATION_JSON).content(PERSONAL_JSON))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true));
        verify(authService).registerPersonal(any());
    }

    @Test
    void personalRegistrationRequiresVerificationTokenEvenWithRawPhoneOtp() throws Exception {
        mvc.perform(post("/api/auth/register/personal").contentType(MediaType.APPLICATION_JSON)
                        .content(PERSONAL_JSON.replace("\"verificationToken\":\"" + "x".repeat(43) + "\",", "\"phoneOtp\":\"123456\",")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.verificationToken").exists());
        verify(authService, never()).registerPersonal(any());
    }

    @Test
    void sendsOtpWithoutLoginAndDoesNotReturnCodeOrSession() throws Exception {
        mvc.perform(post("/api/auth/send-phone-otp").param("phoneNumber", "0912345678").param("recaptchaToken", "captcha"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data").isEmpty());
        verify(otpService).sendPhoneOtp("0912345678", "captcha");
    }

    @Test
    void missingCaptchaReturnsWrappedBadRequest() throws Exception {
        mvc.perform(post("/api/auth/send-phone-otp").param("phoneNumber", "0912345678"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(otpService);
    }

    @Test
    void quotaAndProviderFailureHaveExplicitStatuses() throws Exception {
        doThrow(new OtpRateLimitException("limited")).when(otpService).sendPhoneOtp("0912345678", "captcha");
        mvc.perform(post("/api/auth/send-phone-otp").param("phoneNumber", "0912345678").param("recaptchaToken", "captcha"))
                .andExpect(status().isTooManyRequests()).andExpect(jsonPath("$.isSuccess").value(false));
        doThrow(new SmsProviderException("not configured")).when(otpService).sendPhoneOtp("0912345678", "captcha");
        mvc.perform(post("/api/auth/send-phone-otp").param("phoneNumber", "0912345678").param("recaptchaToken", "captcha"))
                .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.isSuccess").value(false));
    }
}
