package com.be.scamshield.service;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.RoleEnum;
import com.be.scamshield.constant.WhitelistVerificationStatus;
import com.be.scamshield.dto.partner.UpdatePartnerProfileRequest;
import com.be.scamshield.dto.request.WhitelistResourceFilterRequest;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.RoleRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.dto.LoginRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import com.be.scamshield.support.PostgresIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class PartnerProfilePersistenceTest extends PostgresIntegrationTest {
    @MockitoBean private ScamCheckAiClient scamCheckAiClient;

    @Autowired private IPartnerProfileService service;
    @Autowired private PartnerProfileRepository profiles;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private IndicatorRepository indicators;
    @Autowired private WhitelistEntryRepository whitelist;
    @Autowired private IResourceService resources;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private IAuthService authService;

    @Test
    void commitsTheRepresentativeChangeWithoutModifyingVerifiedFieldsOrTheAccount() {
        String roleName = RoleEnum.BUSINESS_PARTNER.name();
        Role role = roles.findByName(roleName).orElseGet(() -> roles.save(Role.builder().name(roleName).build()));
        User user = users.saveAndFlush(User.builder().role(role).status("ACTIVE")
                .email("profile-test@example.com").phoneNumber("0912345678")
                .fullName("Account name").passwordHash("unused").build());
        LocalDateTime originalTime = LocalDateTime.of(2026, 1, 1, 8, 0);
        PartnerProfile profile = profiles.saveAndFlush(PartnerProfile.builder().user(user).legalName("Profile Persistence")
                .brandName("Profile Brand").representativeNameAndTitle("Original representative")
                .taxCode("1234567890").officialDomain("profile.example.com")
                .verificationStatus(PartnerVerificationStatus.VERIFIED).verifiedAt(originalTime)
                .createdAt(originalTime).updatedAt(originalTime).build());
        Indicator indicator = indicators.saveAndFlush(Indicator.builder().type(IndicatorType.URL)
                .normalizedValue("profile.example.com").createdAt(originalTime).updatedAt(originalTime).build());
        whitelist.saveAndFlush(WhitelistEntry.builder().partner(profile).indicator(indicator)
                .verificationStatus(WhitelistVerificationStatus.VERIFIED).autoLockModeration(false)
                .verifiedAt(originalTime).createdAt(originalTime).updatedAt(originalTime).build());

        service.updateOwnProfile(UserPrincipal.create(user),
                new UpdatePartnerProfileRequest(" New representative ", null, null));

        PartnerProfile saved = profiles.findByUserId(user.getId()).orElseThrow();
        assertThat(saved.getRepresentativeNameAndTitle()).isEqualTo("New representative");
        assertThat(saved.getUpdatedAt()).isAfter(originalTime);
        assertThat(saved.getVerifiedAt()).isEqualTo(originalTime);
        assertThat(saved.getLegalName()).isEqualTo("Profile Persistence");
        assertThat(saved.getBrandName()).isEqualTo("Profile Brand");
        assertThat(saved.getTaxCode()).isEqualTo("1234567890");
        assertThat(saved.getOfficialDomain()).isEqualTo("profile.example.com");
        assertThat(saved.getVerificationStatus()).isEqualTo(PartnerVerificationStatus.VERIFIED);
        assertThat(users.findById(user.getId()).orElseThrow().getFullName()).isEqualTo("Account name");

        var filter = new WhitelistResourceFilterRequest();
        filter.setKeyword("Profile Persistence");
        assertThat(resources.getWhiteListResources(filter).getData()).singleElement()
                .satisfies(entry -> assertThat(entry.getRepresentativeNameAndTitle()).isEqualTo("New representative"));
    }

    @Test
    void newEmailCanLogInAfterTheProfileUpdate() {
        String roleName = RoleEnum.BUSINESS_PARTNER.name();
        Role role = roles.findByName(roleName).orElseGet(() -> roles.save(Role.builder().name(roleName).build()));
        User user = users.saveAndFlush(User.builder().role(role).status("ACTIVE")
                .email("old-profile@example.com").phoneNumber("0912345679")
                .fullName("Account name").passwordHash(passwordEncoder.encode("current password")).build());
        profiles.saveAndFlush(PartnerProfile.builder().user(user).legalName("Email change")
                .brandName("Email change").corporateEmail(user.getEmail())
                .verificationStatus(PartnerVerificationStatus.VERIFIED).createdAt(LocalDateTime.now()).build());

        service.updateOwnProfile(UserPrincipal.create(user),
                new UpdatePartnerProfileRequest("New representative", " NEW-Profile@Example.com ", "current password"));

        String email = "new-profile@example.com";
        assertThat(profiles.findByUserId(user.getId()).orElseThrow().getCorporateEmail()).isEqualTo(email);
        assertThat(users.findByEmail("old-profile@example.com")).isEmpty();
        assertThat(users.findByEmail(email).orElseThrow().getId()).isEqualTo(user.getId());
        LoginRequest login = new LoginRequest();
        login.setUsernameOrPhoneNumber(email);
        login.setPassword("current password");
        assertThat(authService.login(login, new MockHttpServletResponse()).getAccessToken()).isNotBlank();
        login.setUsernameOrPhoneNumber("old-profile@example.com");
        assertThatThrownBy(() -> authService.login(login, new MockHttpServletResponse()))
                .isInstanceOf(org.springframework.security.core.AuthenticationException.class);
    }
}
