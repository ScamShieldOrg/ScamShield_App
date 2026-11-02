package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.BusinessLicenseOcrClient;
import com.be.scamshield.external.FirebasePhoneClient;
import com.be.scamshield.external.XinvoiceBusinessClient;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.config.PartnerBusinessVerificationProperties;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.RoleEnum;
import com.be.scamshield.constant.UserStatus;
import com.be.scamshield.dto.ContactVerificationEntry;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.request.RegisterPersonalRequest;
import com.be.scamshield.dto.request.VerifyContactsRequest;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.dto.BusinessRegistryLookup;
import com.be.scamshield.dto.BusinessDocumentOcr;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.Outcome;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ExtractedBusiness;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.RegistrationConflictException;
import com.be.scamshield.exception.SmsProviderException;
import com.be.scamshield.exception.PartnerBusinessVerificationException;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.RoleRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IAuthService;
import com.be.scamshield.service.IContactVerificationStore;
import com.be.scamshield.service.IOtpStore;
import com.be.scamshield.service.IPartnerRegistrationService;
import com.be.scamshield.service.IUserAlertSubscriptionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import tools.jackson.databind.ObjectMapper;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

@SpringBootTest(useMainMethod = SpringBootTest.UseMainMethod.ALWAYS,
        properties = {
                "app.contact-verification.expiration-ms=120000",
                "app.partner-business-verification.ocr.enabled=true",
                "spring.datasource.url=jdbc:h2:mem:scamshield-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
        })
@ActiveProfiles("test")
class PartnerRegistrationPersistenceTest {
    @Autowired
    private IPartnerRegistrationService service;
    @Autowired
    private ContactVerificationService contactVerificationService;
    @Autowired
    private IAuthService authService;
    @MockitoSpyBean
    private IUserAlertSubscriptionService subscriptionService;
    @Autowired
    private PartnerProfileRepository profileRepository;
    @MockitoSpyBean
    private PartnerDocumentRepository documentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private TransactionTemplate transactionTemplate;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private IOtpStore otpStore;
    @Autowired
    private Clock applicationClock;
    @MockitoSpyBean
    private IContactVerificationStore verificationStore;
    @MockitoBean
    private FirebasePhoneClient firebasePhoneClient;
    @MockitoBean
    private XinvoiceBusinessClient xinvoiceBusinessClient;
    @MockitoBean
    private BusinessLicenseOcrClient businessLicenseOcrClient;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private PartnerBusinessVerificationProperties businessVerificationProperties;
    private RegisterPartnerRequest request;
    private List<MultipartFile> files;

    @BeforeEach
    void setUp() {
        documentRepository.deleteAll();
        profileRepository.deleteAll();
        userRepository.deleteAll();
        otpStore.clear();
        verificationStore.clear();
        LocalDateTime now = LocalDateTime.now(applicationClock);
        otpStore.save(OtpEntry.builder().target("0912345678").type(OtpType.PHONE)
                .provider("FIREBASE").providerSessionInfo("test-session").createdAt(now)
                .expiresAt(now.plusMinutes(5)).isVerified(false).failedAttempts(0).build(), Duration.ofMinutes(5));
        LocalDateTime emailNow = LocalDateTime.now(applicationClock);
        otpStore.save(OtpEntry.builder().target("contact@example.com.vn").type(OtpType.EMAIL)
                .otpCode("654321").createdAt(emailNow).expiresAt(emailNow.plusMinutes(5))
                .isVerified(false).failedAttempts(0).build(), Duration.ofMinutes(5));
        if (roleRepository.findByName(RoleEnum.BUSINESS_PARTNER.name()).isEmpty()) {
            roleRepository.saveAndFlush(Role.builder().name(RoleEnum.BUSINESS_PARTNER.name()).build());
        }
        if (roleRepository.findByName(RoleEnum.REGISTERED_USER.name()).isEmpty()) {
            roleRepository.saveAndFlush(Role.builder().name(RoleEnum.REGISTERED_USER.name()).build());
        }
        request = new RegisterPartnerRequest();
        request.setLegalName("Công ty Example");
        request.setTaxCode("0100112437");
        request.setCorporateEmail("contact@example.com.vn");
        request.setRepresentativeNameAndTitle("Huy - Giám đốc");
        request.setContactPhone("0912345678");
        request.setOfficialDomains("example.com.vn");
        request.setOfficialHotlines("1900545413");
        request.setSmsBrandNames("EXAMPLE");
        request.setLegalRepresentative(true);
        request.setAgreeTerms(true);
        files = List.of(new MockMultipartFile("file", "proof.pdf", "application/pdf",
                "%PDF-1.7\nproof".getBytes(StandardCharsets.US_ASCII)));
        when(xinvoiceBusinessClient.lookup(any())).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return new BusinessRegistryLookup(SourceStatus.SUCCESS, invocation.getArgument(0), request.getLegalName(), "NNT đang hoạt động", null);
        });
        when(businessLicenseOcrClient.extract(any(), any())).thenAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive()).isFalse();
            return new BusinessDocumentOcr(SourceStatus.SUCCESS,
                    List.of(new ExtractedBusiness(request.getLegalName(), request.getTaxCode(), 0.99, 0.99)));
        });
    }

    @Test
    void deferredOcrStillStoresPendingDossierWithExplicitlySkippedPdfChecks() {
        prepareVerification();
        boolean original = businessVerificationProperties.getOcr().isEnabled();
        businessVerificationProperties.getOcr().setEnabled(false);
        try {
            PartnerRegistrationResponse response = service.register(request, files, files, null);
            assertThat(response.getVerificationStatus()).isEqualTo(PartnerVerificationStatus.PENDING);
            assertThat(response.getBusinessVerification().ocrEnabled()).isFalse();
            assertThat(response.getBusinessVerification().documents().getFirst().status()).isEqualTo(SourceStatus.DISABLED);
            assertThat(documentRepository.count()).isEqualTo(2);
            var stored = objectMapper.readValue(profileRepository.findById(response.getRegistrationId()).orElseThrow()
                    .getBusinessVerificationResult(), PartnerBusinessVerificationResponse.class);
            assertThat(stored.ocrEnabled()).isFalse();
            assertThat(stored.documents().getFirst().status()).isEqualTo(SourceStatus.DISABLED);
            verifyNoInteractions(businessLicenseOcrClient);
        } finally {
            businessVerificationProperties.getOcr().setEnabled(original);
        }
    }

    @Test
    void commitsLinkedAccountWithGeneratedPasswordAndPendingApplicationWithoutWhitelist() {
        prepareVerification();
        long usersBefore = userRepository.count();
        PartnerRegistrationResponse response = service.register(request, files, files, null);
        assertThat(profileRepository.findById(response.getRegistrationId())).isPresent();
        assertThat(documentRepository.count()).isEqualTo(2);
        assertThat(jdbc.queryForObject("select official_domain from partner_profiles where id = ?", String.class,
                response.getRegistrationId())).isEqualTo("example.com.vn");
        byte[] stored = jdbc.queryForObject("select content from partner_documents where document_type = 'BUSINESS_LICENSE'", byte[].class);
        assertThat(stored).isEqualTo("%PDF-1.7\nproof".getBytes(StandardCharsets.US_ASCII));
        assertThat(userRepository.count()).isEqualTo(usersBefore + 1);
        transactionTemplate.executeWithoutResult(status -> {
            User user = userRepository.findById(response.getUserId()).orElseThrow();
            assertThat(user.getEmail()).isEqualTo("contact@example.com.vn");
            assertThat(user.getPhoneNumber()).isEqualTo("0912345678");
            assertThat(user.getRole().getName()).isEqualTo(RoleEnum.BUSINESS_PARTNER.name());
            assertThat(user.getStatus()).isEqualTo(UserStatus.INACTIVE.name());
            assertThat(user.getIsPhoneVerified()).isTrue();
            assertThat(user.getPasswordHash()).startsWith("$2a$");
            assertThat(passwordEncoder.matches("Example123!", user.getPasswordHash())).isFalse();
            assertThat(profileRepository.findById(response.getRegistrationId()).orElseThrow().getUser().getId())
                    .isEqualTo(user.getId());
            PartnerProfile profile = profileRepository.findById(response.getRegistrationId()).orElseThrow();
            assertThat(profile.getTaxCode()).isEqualTo("0100112437");
            assertThat(profile.getBrandName()).isEqualTo(request.getLegalName());
            assertThat(profile.getPartnerType()).isEqualTo("BUSINESS");
            assertThat(profile.getVerificationStatus()).isEqualTo(PartnerVerificationStatus.PENDING);
            assertThat(profile.getVerifiedAt()).isNull();
            assertThat(profile.getOfficialDomain()).isEqualTo("example.com.vn");
            assertThat(profile.getOfficialHotline()).isEqualTo("1900545413");
            assertThat(profile.getSmsBrandName()).isEqualTo("EXAMPLE");
            assertThat(documentRepository.findAll()).allSatisfy(document ->
                    assertThat(document.getPartner().getId()).isEqualTo(profile.getId()));
        });
        assertThat(jdbc.queryForObject("select count(*) from whitelist_entries", Long.class)).isZero();
        assertThat(otpStore.findLatest("contact@example.com.vn", OtpType.EMAIL).orElseThrow().isVerified()).isFalse();
        assertThat(response.getBusinessVerification().outcome()).isEqualTo(Outcome.MATCHED);
        PartnerBusinessVerificationResponse storedCheck = objectMapper.readValue(
                profileRepository.findById(response.getRegistrationId()).orElseThrow().getBusinessVerificationResult(),
                PartnerBusinessVerificationResponse.class);
        assertThat(storedCheck).isEqualTo(response.getBusinessVerification());
        assertThat(objectMapper.writeValueAsString(storedCheck)).doesNotContain("representative", "Huy - Giám đốc");
    }

    @Test
    void existingApprovedProfileCanStillBeStoredWithoutNewDossierFields() {
        LocalDateTime now = LocalDateTime.now(applicationClock);
        User user = userRepository.saveAndFlush(User.builder().fullName("Legacy partner")
                .phoneNumber("0912345679").email("legacy@example.com").passwordHash("existing-hash")
                .status(UserStatus.ACTIVE.name()).reputationPoints(0).createdAt(now).updatedAt(now).build());
        PartnerProfile profile = profileRepository.saveAndFlush(PartnerProfile.builder().user(user)
                .legalName("Existing company").brandName("Existing brand").partnerType("BUSINESS")
                .verificationStatus(PartnerVerificationStatus.VERIFIED).verifiedAt(now).createdAt(now).build());
        PartnerProfile stored = profileRepository.findById(profile.getId()).orElseThrow();
        assertThat(stored.getVerificationStatus()).isEqualTo(PartnerVerificationStatus.VERIFIED);
        assertThat(stored.getBrandName()).isEqualTo("Existing brand");
        assertThat(stored.getTaxCode()).isNull();
        assertThat(stored.getVerifiedAt()).isNotNull();
    }

    @Test
    void evidencePersistenceFailureRollsBackApplication() {
        prepareVerification();
        doThrow(new IllegalStateException("evidence storage failed")).when(documentRepository).saveAll(any());
        assertThatThrownBy(() -> service.register(request, files, files, null)).isInstanceOf(IllegalStateException.class);
        assertThat(profileRepository.count()).isZero();
        assertThat(documentRepository.count()).isZero();
        assertThat(userRepository.count()).isZero();
        assertThat(verificationStore.findByTokenHash(contactVerificationService.hashToken(request.getVerificationToken())).orElseThrow().getUsedAt()).isNull();
    }

    @Test
    void duplicateAccountEmailDoesNotLeaveAnotherAccountOrApplication() {
        prepareVerification();
        service.register(request, files, files, null);
        request.setTaxCode("0100112438");
        request.setContactPhone("0912345679");
        request.setCorporateEmail("CONTACT@EXAMPLE.COM.VN");
        assertThatThrownBy(() -> service.register(request, files, files, null))
                .isInstanceOf(RegistrationConflictException.class).hasMessageContaining("Email");
        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(profileRepository.count()).isEqualTo(1);
        assertThat(documentRepository.count()).isEqualTo(2);
    }

    @Test
    void incorrectSmsOtpPersistsAttemptAndPreventsRegistration() {
        doThrow(new IllegalArgumentException("invalid OTP")).when(firebasePhoneClient)
                .verify("test-session", "123456", "+84912345678");
        assertThatThrownBy(() -> contactVerificationService.verifyContacts(contacts()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(userRepository.count()).isZero();
        assertThat(profileRepository.count()).isZero();
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().getFailedAttempts()).isEqualTo(1);
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isFalse();
        assertThat(otpStore.findLatest("contact@example.com.vn", OtpType.EMAIL).orElseThrow().isVerified()).isFalse();
    }

    @Test
    void wrongSmsDoesNotVerifyPhoneAndRetryIssuesPhoneToken() {
        VerifyContactsRequest contacts = contacts();
        contacts.setPhoneOtp("000000");
        doThrow(new IllegalArgumentException("invalid OTP")).when(firebasePhoneClient)
                .verify("test-session", "000000", "+84912345678");
        assertThatThrownBy(() -> contactVerificationService.verifyContacts(contacts))
                .isInstanceOf(IllegalArgumentException.class).hasMessageStartingWith("OTP điện thoại không hợp lệ:");
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isFalse();
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().getFailedAttempts()).isEqualTo(1);

        contacts.setPhoneOtp("123456");
        assertThat(contactVerificationService.verifyContacts(contacts).getVerificationToken()).hasSize(43);
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isTrue();
    }

    @Test
    void providerOutageDoesNotConsumeEitherOtpOrCountAsAnIncorrectAttempt() {
        doThrow(new SmsProviderException("provider unavailable")).when(firebasePhoneClient)
                .verify("test-session", "123456", "+84912345678");
        assertThatThrownBy(() -> contactVerificationService.verifyContacts(contacts()))
                .isInstanceOf(SmsProviderException.class);
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isFalse();
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().getFailedAttempts()).isZero();
    }

    @Test
    void failureToStoreContactProofRollsBackBothVerifiedFlags() {
        doThrow(new IllegalStateException("proof storage failed")).when(verificationStore).save(any(), any());
        assertThatThrownBy(() -> contactVerificationService.verifyContacts(contacts()))
                .isInstanceOf(IllegalStateException.class);
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isFalse();
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().getProviderSessionInfo())
                .isEqualTo("test-session");
    }

    @ParameterizedTest
    @ValueSource(strings = {"expired", "used", "phone", "missing", "unknown"})
    void partnerRequiresValidPhoneVerificationToken(String state) {
        prepareVerification();
        String tokenHash = contactVerificationService.hashToken(request.getVerificationToken());
        switch (state) {
            case "expired" -> verificationStore.findByTokenHash(tokenHash).ifPresent(e -> e.setExpiresAt(LocalDateTime.now(applicationClock).minusMinutes(1)));
            case "used" -> verificationStore.findByTokenHash(tokenHash).ifPresent(e -> e.setUsedAt(LocalDateTime.now(applicationClock)));
            case "phone" -> request.setContactPhone("0912345679");
            case "missing" -> request.setVerificationToken(null);
            case "unknown" -> request.setVerificationToken("x".repeat(43));
            default -> throw new IllegalStateException();
        }
        assertThatThrownBy(() -> service.register(request, files, files, null)).isInstanceOf(BadRequestException.class);
        assertThat(userRepository.count()).isZero();
        assertThat(profileRepository.count()).isZero();
        verifyNoInteractions(xinvoiceBusinessClient, businessLicenseOcrClient);
    }

    @Test
    void inactiveRegistryBlocksSubmissionWithoutConsumingToken() {
        prepareVerification();
        when(xinvoiceBusinessClient.lookup(any())).thenReturn(new BusinessRegistryLookup(SourceStatus.SUCCESS,
                request.getTaxCode(), request.getLegalName(), "NNT ngừng hoạt động và đã đóng MST", null));
        when(businessLicenseOcrClient.extract(any(), any())).thenReturn(new BusinessDocumentOcr(SourceStatus.SUCCESS,
                List.of(new ExtractedBusiness("CÔNG TY KHÁC", "0100112438", 0.99, 0.99))));
        assertThatThrownBy(() -> service.register(request, files, files, null))
                .isInstanceOfSatisfying(PartnerBusinessVerificationException.class, ex -> {
                    assertThat(ex.getHttpStatus()).isEqualTo(422);
                    assertThat(ex.getVerification().outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
                    assertThat(ex.getMessage()).contains("đang hoạt động");
                });
        assertThat(userRepository.count()).isZero();
        assertThat(profileRepository.count()).isZero();
        assertThat(documentRepository.count()).isZero();
        assertThat(verificationStore.findByTokenHash(contactVerificationService.hashToken(request.getVerificationToken()))
                .orElseThrow().getUsedAt()).isNull();
        assertThat(jdbc.queryForObject("select count(*) from whitelist_entries", Long.class)).isZero();
        verifyNoInteractions(businessLicenseOcrClient);
    }

    @ParameterizedTest
    @ValueSource(strings = {"name", "taxCode", "lowConfidence", "missingConfidence", "unreadable"})
    void ocrMismatchOrUncertaintyBlocksSubmissionWithoutAccountOrConsumedToken(String failure) {
        prepareVerification();
        BusinessDocumentOcr result = switch (failure) {
            case "name" -> new BusinessDocumentOcr(SourceStatus.SUCCESS,
                    List.of(new ExtractedBusiness("CÔNG TY KHÁC", request.getTaxCode(), 0.99, 0.99)));
            case "taxCode" -> new BusinessDocumentOcr(SourceStatus.SUCCESS,
                    List.of(new ExtractedBusiness(request.getLegalName(), "0100112438", 0.99, 0.99)));
            case "lowConfidence" -> new BusinessDocumentOcr(SourceStatus.SUCCESS,
                    List.of(new ExtractedBusiness(request.getLegalName(), request.getTaxCode(), 0.5, 0.5)));
            case "missingConfidence" -> new BusinessDocumentOcr(SourceStatus.SUCCESS,
                    List.of(new ExtractedBusiness(request.getLegalName(), request.getTaxCode(), null, null)));
            default -> BusinessDocumentOcr.unavailable(SourceStatus.UNREADABLE);
        };
        when(businessLicenseOcrClient.extract(any(), any())).thenReturn(result);
        assertThatThrownBy(() -> service.register(request, files, files, null))
                .isInstanceOfSatisfying(PartnerBusinessVerificationException.class, ex -> assertThat(ex.getHttpStatus()).isEqualTo(422));
        assertThat(userRepository.count()).isZero();
        assertThat(profileRepository.count()).isZero();
        assertThat(documentRepository.count()).isZero();
        assertThat(verificationStore.findByTokenHash(contactVerificationService.hashToken(request.getVerificationToken()))
                .orElseThrow().getUsedAt()).isNull();
    }

    @Test
    void providerOutageCanRetrySameTokenAndRepresentativeIsNotCompared() {
        prepareVerification();
        request.setRepresentativeNameAndTitle("Một người khác hoàn toàn");
        when(xinvoiceBusinessClient.lookup(any())).thenReturn(BusinessRegistryLookup.unavailable(SourceStatus.UNAVAILABLE));
        assertThatThrownBy(() -> service.register(request, files, files, null))
                .isInstanceOfSatisfying(PartnerBusinessVerificationException.class, ex -> {
                    assertThat(ex.getHttpStatus()).isEqualTo(503);
                    assertThat(ex.getVerification().xinvoice().status()).isEqualTo(SourceStatus.UNAVAILABLE);
                });
        assertThat(userRepository.count()).isZero();
        assertThat(profileRepository.count()).isZero();
        assertThat(verificationStore.findByTokenHash(contactVerificationService.hashToken(request.getVerificationToken()))
                .orElseThrow().getUsedAt()).isNull();
        when(xinvoiceBusinessClient.lookup(any())).thenReturn(new BusinessRegistryLookup(SourceStatus.SUCCESS,
                request.getTaxCode(), request.getLegalName(), "NNT đang hoạt động", null));
        PartnerRegistrationResponse response = service.register(request, files, files, null);
        assertThat(response.getBusinessVerification().outcome()).isEqualTo(Outcome.MATCHED);
        assertThat(profileRepository.findById(response.getRegistrationId()).orElseThrow().getBusinessVerificationResult())
                .doesNotContain("Một người khác hoàn toàn");
    }

    @Test
    void verifyPhoneBeforeFormAndRegistrationConsumesOnlyToken() {
        LocalDateTime beforeVerification = LocalDateTime.now(applicationClock);
        prepareVerification();
        String tokenHash = contactVerificationService.hashToken(request.getVerificationToken());
        assertThat(verificationStore.findByTokenHash(tokenHash).orElseThrow().getExpiresAt())
                .isCloseTo(beforeVerification.plusMinutes(2), within(1, ChronoUnit.SECONDS));
        assertThat(userRepository.count()).isZero();
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isTrue();
        request.setCorporateEmail("different@gmail.com");
        service.register(request, files, files, null);
        assertThat(verificationStore.findByTokenHash(tokenHash).orElseThrow().getUsedAt()).isNotNull();
        assertThat(otpStore.findLatest("contact@example.com.vn", OtpType.EMAIL).orElseThrow().isVerified()).isFalse();
    }

    private void prepareVerification() {
        request.setVerificationToken(contactVerificationService.verifyContacts(contacts()).getVerificationToken());
    }

    @Test
    void phoneTokenCreatesPersonalAccountWithoutEmailOtpOrPartnerProfile() {
        prepareVerification();
        RegisterPersonalRequest personal = personal();
        personal.setEmail("CONTACT@EXAMPLE.COM.VN");
        authService.registerPersonal(personal);
        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(profileRepository.count()).isZero();
        assertThat(documentRepository.count()).isZero();
        transactionTemplate.executeWithoutResult(status -> {
            User user = userRepository.findAll().getFirst();
            assertThat(user.getEmail()).isEqualTo("contact@example.com.vn");
            assertThat(user.getPhoneNumber()).isEqualTo("0912345678");
            assertThat(user.getIsPhoneVerified()).isTrue();
            assertThat(user.getRole().getName()).isEqualTo(RoleEnum.REGISTERED_USER.name());
            assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE.name());
            assertThat(passwordEncoder.matches(personal.getPassword(), user.getPasswordHash())).isTrue();
        });
        String tokenHash = contactVerificationService.hashToken(personal.getVerificationToken());
        assertThat(verificationStore.findByTokenHash(tokenHash).orElseThrow().getUsedAt()).isNotNull();
        assertThatThrownBy(() -> transactionTemplate.executeWithoutResult(status ->
                contactVerificationService.consume(personal.getVerificationToken(), "0912345678")))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("đã dùng");
    }

    @Test
    void applicationClockAndStoredOtpTimesUseVietnamTime() {
        assertThat(applicationClock.getZone().getId()).isEqualTo("Asia/Ho_Chi_Minh");
        LocalDateTime storedPhone = otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().getCreatedAt();
        LocalDateTime storedEmail = otpStore.findLatest("contact@example.com.vn", OtpType.EMAIL).orElseThrow().getCreatedAt();
        assertThat(storedPhone).isCloseTo(storedEmail, within(1, ChronoUnit.SECONDS));
        assertThat(storedPhone.atZone(applicationClock.getZone()).toInstant())
                .isCloseTo(applicationClock.instant(), within(10, ChronoUnit.SECONDS));
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "unknown", "expired", "used", "phone"})
    void personalRegistrationRequiresValidPhoneVerificationToken(String state) {
        prepareVerification();
        RegisterPersonalRequest personal = personal();
        String tokenHash = contactVerificationService.hashToken(personal.getVerificationToken());
        switch (state) {
            case "missing" -> personal.setVerificationToken(null);
            case "unknown" -> personal.setVerificationToken("x".repeat(43));
            case "expired" -> verificationStore.findByTokenHash(tokenHash).ifPresent(e -> e.setExpiresAt(LocalDateTime.now(applicationClock).minusMinutes(1)));
            case "used" -> verificationStore.findByTokenHash(tokenHash).ifPresent(e -> e.setUsedAt(LocalDateTime.now(applicationClock)));
            case "phone" -> personal.setPhoneNumber("0912345679");
            default -> throw new IllegalStateException();
        }
        assertThatThrownBy(() -> authService.registerPersonal(personal)).isInstanceOf(BadRequestException.class);
        assertThat(userRepository.count()).isZero();
    }

    @Test
    void personalRegistrationFailureRollsBackAccountAndTokenSoSubmissionCanRetry() {
        prepareVerification();
        RegisterPersonalRequest personal = personal();
        personal.setReceiveAlerts(true);
        doThrow(new IllegalStateException("subscription failed")).when(subscriptionService).subscribeAllCategories(any());
        assertThatThrownBy(() -> authService.registerPersonal(personal)).isInstanceOf(IllegalStateException.class);
        assertThat(userRepository.count()).isZero();
        String tokenHash = contactVerificationService.hashToken(personal.getVerificationToken());
        assertThat(verificationStore.findByTokenHash(tokenHash).orElseThrow().getUsedAt()).isNull();
        personal.setReceiveAlerts(false);
        authService.registerPersonal(personal);
        assertThat(userRepository.count()).isEqualTo(1);
    }

    private RegisterPersonalRequest personal() {
        RegisterPersonalRequest personal = new RegisterPersonalRequest();
        personal.setFullName("Nguyễn Văn An");
        personal.setEmail(request.getCorporateEmail());
        personal.setPhoneNumber(request.getContactPhone());
        personal.setPassword("Example123!");
        personal.setAgreeTerms(true);
        personal.setVerificationToken(request.getVerificationToken());
        return personal;
    }

    @Test
    void parallelPersonalAndPartnerRegistrationCannotConsumeTheSameTokenTwice() throws Exception {
        prepareVerification();
        RegisterPersonalRequest personal = personal();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var personalResult = executor.submit(() -> {
                try {
                    authService.registerPersonal(personal);
                    return true;
                } catch (BadRequestException | RegistrationConflictException ex) {
                    return false;
                }
            });
            var partnerResult = executor.submit(() -> {
                try {
                    service.register(request, files, files, null);
                    return true;
                } catch (BadRequestException | RegistrationConflictException ex) {
                    return false;
                }
            });
            assertThat((personalResult.get() ? 1 : 0) + (partnerResult.get() ? 1 : 0)).isEqualTo(1);
        }
        assertThat(userRepository.count()).isEqualTo(1);
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().isVerified()).isTrue();
    }

    private VerifyContactsRequest contacts() {
        VerifyContactsRequest contacts = new VerifyContactsRequest();
        contacts.setPhoneNumber(request.getContactPhone());
        contacts.setPhoneOtp("123456");
        return contacts;
    }
}
