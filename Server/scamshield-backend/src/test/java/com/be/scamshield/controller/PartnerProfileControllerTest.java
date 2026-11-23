package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.ResourceRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistResourceRepository;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.serviceImpl.PartnerProfileServiceImpl;
import com.be.scamshield.serviceImpl.ResourceServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({PartnerProfileController.class, ResourceController.class})
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class,
        PartnerProfileServiceImpl.class, ResourceServiceImpl.class})
@ActiveProfiles("test")
class PartnerProfileControllerTest {
    private static final String PROFILE = "/api/partner/profile";

    @Autowired private MockMvc mvc;
    @MockitoBean private PartnerProfileRepository profiles;
    @MockitoBean private UserRepository users;
    @MockitoBean private PasswordEncoder passwordEncoder;
    @MockitoBean private ResourceRepository resources;
    @MockitoBean private WhitelistResourceRepository whitelist;
    @MockitoBean private JwtTokenProvider tokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;
    @MockitoBean private Clock applicationClock;

    @Test
    void requiresAnAuthenticatedPartnerForBothMethods() throws Exception {
        mvc.perform(get(PROFILE)).andExpect(status().isUnauthorized());
        mvc.perform(patch(PROFILE)).andExpect(status().isUnauthorized());
        var ordinaryUser = user(principal(1L, "REGISTERED_USER"));
        mvc.perform(get(PROFILE).with(ordinaryUser)).andExpect(status().isForbidden());
        mvc.perform(patch(PROFILE).with(ordinaryUser)).andExpect(status().isForbidden());
        verifyNoInteractions(profiles);
    }

    @Test
    void updatesOnlyTheSignedInPartnersRepresentativeAndExposesItThroughTheWhitelist() throws Exception {
        PartnerProfile first = profile(1L, "Alpha", PartnerVerificationStatus.VERIFIED);
        PartnerProfile second = profile(2L, "Beta", PartnerVerificationStatus.VERIFIED);
        first.setTaxCode("1234567890");
        first.setCorporateEmail("alpha@example.com");
        first.setOfficialDomain("alpha.example");
        first.setRegistrationToken("internal-token");
        first.setVerifiedAt(LocalDateTime.of(2026, 11, 1, 9, 0));
        first.setUser(User.builder().fullName("Original account name").build());
        when(profiles.findByUserId(1L)).thenReturn(Optional.of(first));
        when(profiles.findByUserId(2L)).thenReturn(Optional.of(second));
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-22T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));

        mvc.perform(patch(PROFILE).with(user(principal(1L, "BUSINESS_PARTNER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"representativeNameAndTitle":"  New representative  ","userId":2,"legalName":"Injected",
                                 "taxCode":"9999999999","officialDomain":"other.example",
                                 "legalRepresentative":false,"verificationStatus":"REJECTED"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.representativeNameAndTitle").value("New representative"))
                .andExpect(jsonPath("$.data.legalName").value("Alpha"))
                .andExpect(jsonPath("$.data.taxCode").value("1234567890"))
                .andExpect(jsonPath("$.data.corporateEmail").value("alpha@example.com"))
                .andExpect(jsonPath("$.data.officialDomain").value("alpha.example"))
                .andExpect(jsonPath("$.data.legalRepresentative").value(true))
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"))
                .andExpect(jsonPath("$.data.registrationToken").doesNotHaveJsonPath());

        assertThat(first.getVerifiedAt()).isEqualTo(LocalDateTime.of(2026, 11, 1, 9, 0));
        assertThat(first.getUpdatedAt()).isEqualTo(LocalDateTime.of(2026, 11, 22, 9, 0));
        assertThat(first.getUser().getFullName()).isEqualTo("Original account name");
        mvc.perform(get(PROFILE).with(user(principal(1L, "BUSINESS_PARTNER"))))
                .andExpect(jsonPath("$.data.representativeNameAndTitle").value("New representative"));
        mvc.perform(get(PROFILE).with(user(principal(2L, "BUSINESS_PARTNER"))))
                .andExpect(jsonPath("$.data.legalName").value("Beta"))
                .andExpect(jsonPath("$.data.representativeNameAndTitle").value("Original representative"))
                .andExpect(jsonPath("$.data.taxCode").value(nullValue()));

        when(whitelist.findVerifiedPartners(eq(PartnerVerificationStatus.VERIFIED), isNull(), any(), any()))
                .thenReturn(new PageImpl<>(List.of(first)));
        mvc.perform(get("/api/resources/whitelist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.data[0].representativeNameAndTitle").value("New representative"));
    }

    @Test
    void returnsNotFoundWhenTheAccountHasNoProfile() throws Exception {
        var partner = user(principal(1L, "BUSINESS_PARTNER"));
        mvc.perform(get(PROFILE).with(partner)).andExpect(status().isNotFound());
        mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"representativeNameAndTitle\":\"New representative\"}"))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @EnumSource(value = PartnerVerificationStatus.class, names = {"PENDING", "REJECTED"})
    void unverifiedPartnerCanReadButCannotEdit(PartnerVerificationStatus verificationStatus) throws Exception {
        PartnerProfile profile = profile(1L, "Alpha", verificationStatus);
        when(profiles.findByUserId(1L)).thenReturn(Optional.of(profile));
        var partner = user(principal(1L, "BUSINESS_PARTNER"));
        mvc.perform(get(PROFILE).with(partner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value(verificationStatus.name()));
        mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"representativeNameAndTitle\":\"New representative\"}"))
                .andExpect(status().isForbidden());
        assertThat(profile.getRepresentativeNameAndTitle()).isEqualTo("Original representative");
        assertThat(profile.getUpdatedAt()).isNull();
    }

    @Test
    void rejectsMissingBlankAndOversizedRepresentativeNames() throws Exception {
        var partner = user(principal(1L, "BUSINESS_PARTNER"));
        for (String body : List.of("{\"representativeNameAndTitle\":\"   \"}",
                "{\"representativeNameAndTitle\":\"" + "x".repeat(256) + "\"}")) {
            mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.data.representativeNameAndTitle").isString());
        }
        verifyNoInteractions(profiles);
    }

    @Test
    void changesContactEmailOnlyAfterConfirmingTheCurrentPassword() throws Exception {
        var partner = user(principal(1L, "BUSINESS_PARTNER"));
        PartnerProfile profile = profile(1L, "Alpha", PartnerVerificationStatus.VERIFIED);
        User account = User.builder().id(1L).email("user1@example.com").passwordHash("hash").build();
        profile.setUser(account);
        when(profiles.findByUserId(1L)).thenReturn(Optional.of(profile));
        when(passwordEncoder.matches("current", "hash")).thenReturn(true);
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-22T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"corporateEmail\":\"new@example.com\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"corporateEmail":"new@example.com","currentPassword":"wrong",
                                 "representativeNameAndTitle":"New representative"}
                                """))
                .andExpect(status().isBadRequest());
        assertThat(profile.getCorporateEmail()).isNull();
        assertThat(profile.getRepresentativeNameAndTitle()).isEqualTo("Original representative");
        when(users.existsByEmailIgnoreCase("taken@example.com")).thenReturn(true);
        mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"corporateEmail":"taken@example.com","currentPassword":"current"}
                                """))
                .andExpect(status().isConflict());
        assertThat(account.getEmail()).isEqualTo("user1@example.com");
        mvc.perform(patch(PROFILE).with(partner).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"corporateEmail":" New@Example.com ","currentPassword":"current"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.corporateEmail").value("new@example.com"))
                .andExpect(jsonPath("$.data.accessToken").doesNotHaveJsonPath());
        assertThat(account.getEmail()).isEqualTo("new@example.com");
    }

    private PartnerProfile profile(long id, String name, PartnerVerificationStatus status) {
        return PartnerProfile.builder().id(id).legalName(name).brandName(name)
                .representativeNameAndTitle("Original representative").legalRepresentative(true)
                .verificationStatus(status).build();
    }

    private UserPrincipal principal(long id, String role) {
        return UserPrincipal.create(User.builder().id(id).email("user" + id + "@example.com")
                .passwordHash("unused").status("ACTIVE").role(Role.builder().name(role).build()).build());
    }
}
