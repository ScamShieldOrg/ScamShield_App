package com.be.scamshield.controller;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.config.PartnerMultipartConfig;
import com.be.scamshield.exception.RegistrationConflictException;
import com.be.scamshield.exception.PartnerBusinessVerificationException;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ActivityStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.RegistryResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.MatchResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.Outcome;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import java.util.List;
import com.be.scamshield.service.IPartnerRegistrationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.NullSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.mock.web.MockPart;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PartnerRegistrationController.class)
@Import({SecurityConfig.class, PartnerMultipartConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class PartnerRegistrationControllerTest {
    private static final String URL = "/api/partners/registrations";
    private static final String VALID_JSON = """
            {"legalName":"Công ty Example", "taxCode":"0100112437",
             "corporateEmail":"contact@example.com.vn", "representativeNameAndTitle":"Huy - Giám đốc",
             "contactPhone":"0912345678", "verificationToken":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "officialDomains":"example.com.vn",
             "officialHotlines":"1900545413", "smsBrandNames":"EXAMPLE",
             "legalRepresentative":true, "agreeTerms":true}
            """;
    @MockitoBean
    private IPartnerRegistrationService service;
    @MockitoBean
    private JwtTokenProvider tokenProvider;
    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;
    @Autowired
    private MockMvc mvc;

    @Test
    void acceptsJsonAndFilesAndReturnsCreatedWrappedResponse() throws Exception {
        when(service.register(any(), any(), any(), any())).thenReturn(
                new PartnerRegistrationResponse(42L, 7L, PartnerVerificationStatus.PENDING, LocalDateTime.of(2026, 10, 6, 10, 0)));
        mvc.perform(multipart(URL).file(json(VALID_JSON))
                        .file(new MockMultipartFile("businessLicenseFiles", "license.pdf", "application/pdf", new byte[]{1}))
                        .file(new MockMultipartFile("ownershipProofFiles", "proof.pdf", "application/pdf", new byte[]{1})))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.registrationId").value(42))
                .andExpect(jsonPath("$.data.userId").value(7))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.verificationStatus").value("PENDING"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0912345678", "+84912345678", "+84 912 345 678", "(0912) 345-678"})
    void acceptsSupportedContactPhoneFormats(String phone) throws Exception {
        when(service.register(any(), any(), any(), any())).thenReturn(
                new PartnerRegistrationResponse(42L, 7L, PartnerVerificationStatus.PENDING, LocalDateTime.of(2026, 10, 6, 10, 0)));
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("0912345678", phone))))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.isSuccess").value(true));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   ", "091234567", "09123456789", "0212345678", "+840912345678", "+19123456789", "19001234"})
    void rejectsInvalidContactPhoneBeforeRegistration(String phone) throws Exception {
        String value = phone == null ? "null" : "\"" + phone + "\"";
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("\"contactPhone\":\"0912345678\"", "\"contactPhone\":" + value))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.data.contactPhone").exists());
        verifyNoInteractions(service);
    }

    @Test
    void requiresVerificationTokenBeforeSubmittingForm() throws Exception {
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("\"verificationToken\":\"" + "x".repeat(43) + "\",", ""))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.verificationToken").exists());
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "12345", "abcdef"})
    void rejectsMalformedVerificationToken(String code) throws Exception {
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("x".repeat(43), code))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.verificationToken").exists());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsMissingRequiredFieldWithFieldErrors() throws Exception {
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("\"taxCode\":\"0100112437\"", "\"taxCode\":\"\""))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.data.taxCode").exists());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsNullDomainAndMissingConsent() throws Exception {
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("\"officialDomains\":\"example.com.vn\"", "\"officialDomains\":null"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(multipart(URL).file(json(VALID_JSON.replace("\"agreeTerms\":true", "\"agreeTerms\":false"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.agreeTerms").exists());
        verifyNoInteractions(service);
    }

    @Test
    void rejectsMissingOrMalformedJsonUsingBaseResponse() throws Exception {
        mvc.perform(multipart(URL)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(multipart(URL).file(json("{invalid"))).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.isSuccess").value(false));
        verifyNoInteractions(service);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"text/plain", "application/octet-stream"})
    void acceptsSwaggerJsonFormFieldWithoutJsonContentType(String contentType) throws Exception {
        when(service.register(any(), any(), any(), any())).thenReturn(
                new PartnerRegistrationResponse(42L, 7L, PartnerVerificationStatus.PENDING, LocalDateTime.of(2026, 10, 6, 10, 0)));
        MockPart request = formPart(VALID_JSON, contentType);
        mvc.perform(multipart(URL).part(request)
                        .file(new MockMultipartFile("businessLicenseFiles", "license.pdf", "application/pdf", new byte[]{1})))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.registrationId").value(42));
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"text/plain", "application/octet-stream"})
    void validatesAndRejectsMalformedSwaggerJsonBeforeCallingService(String contentType) throws Exception {
        mvc.perform(multipart(URL).part(formPart("{invalid", contentType)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(multipart(URL).part(formPart(VALID_JSON.replace("\"corporateEmail\":\"contact@example.com.vn\"",
                        "\"corporateEmail\":\"string\""), contentType)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.corporateEmail").exists());
        verifyNoInteractions(service);
    }

    @Test
    void stillRejectsUnrelatedMediaType() throws Exception {
        mvc.perform(multipart(URL).part(formPart(VALID_JSON, "application/xml")))
                .andExpect(status().isUnsupportedMediaType());
        verifyNoInteractions(service);
    }

    private MockPart formPart(String value, String contentType) {
        MockPart request = new MockPart("request", value.getBytes(StandardCharsets.UTF_8));
        if (contentType != null) {
            request.getHeaders().setContentType(MediaType.parseMediaType(contentType));
        }
        return request;
    }

    @Test
    void wrapsDuplicateConflict() throws Exception {
        when(service.register(any(), any(), any(), any())).thenThrow(
                new RegistrationConflictException("Mã số thuế đã có hồ sơ"));
        mvc.perform(multipart(URL).file(json(VALID_JSON))).andExpect(status().isConflict())
                .andExpect(jsonPath("$.isSuccess").value(false));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUCCESS", "UNAVAILABLE", "NOT_CONFIGURED", "NOT_FOUND"})
    void returnsStructuredBusinessFailureInsteadOfCreatingApplication(String sourceStatus) throws Exception {
        SourceStatus source = SourceStatus.valueOf(sourceStatus);
        var result = new PartnerBusinessVerificationResponse(Outcome.REVIEW_REQUIRED,
                LocalDateTime.of(2026, 10, 27, 10, 0), "Công ty Example", "0100112437",
                new RegistryResult(source, "Công ty khác", "0100112437", "NNT ngừng hoạt động và đã đóng MST",
                        ActivityStatus.NOT_ACTIVE, null), MatchResult.MISMATCH, MatchResult.MATCHED, List.of(), true);
        when(service.register(any(), any(), any(), any())).thenThrow(new PartnerBusinessVerificationException(result));
        mvc.perform(multipart(URL).file(json(VALID_JSON)))
                .andExpect(status().is(source == SourceStatus.UNAVAILABLE || source == SourceStatus.NOT_CONFIGURED ? 503 : 422))
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.data.outcome").value("REVIEW_REQUIRED"))
                .andExpect(jsonPath("$.data.xinvoice.status").value(sourceStatus))
                .andExpect(jsonPath("$.data.formNameVsXinvoice").value("MISMATCH"))
                .andExpect(jsonPath("$.data.representativeNameAndTitle").doesNotExist());
    }

    private MockMultipartFile json(String value) {
        return new MockMultipartFile("request", "", MediaType.APPLICATION_JSON_VALUE, value.getBytes(StandardCharsets.UTF_8));
    }
}
