package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.NotificationType;
import com.be.scamshield.constant.ConfirmedIndicatorStatus;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.ReviewPartnerSubmissionRequest;
import com.be.scamshield.dto.partner.SubmitPartnerAlertRequest;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.OfficialScamWarning;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.PartnerOfficialAlert;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.PartnerSubmissionConflictException;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.NotificationRepository;
import com.be.scamshield.repository.OfficialScamWarningRepository;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerOfficialAlertRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.ScamCategorieRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.external.SupabaseStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartnerSubmissionServiceImplTest {

    @Mock
    private PartnerOfficialAlertRepository partnerOfficialAlertRepository;

    @Mock
    private PartnerProfileRepository partnerProfileRepository;

    @Mock
    private PartnerDocumentRepository partnerDocumentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private IndicatorRepository indicatorRepository;

    @Mock
    private ConfirmedIndicatorRepository confirmedIndicatorRepository;

    @Mock
    private ScamCategorieRepository scamCategorieRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private OfficialScamWarningRepository officialScamWarningRepository;

    @Mock
    private WhitelistEntryRepository whitelistEntryRepository;

    @Mock
    private Clock applicationClock;

    @Mock
    private SupabaseStorageService supabaseStorageService;

    @InjectMocks
    private PartnerSubmissionServiceImpl service;

    private User partnerUser;
    private PartnerProfile partnerProfile;
    private UserPrincipal partnerPrincipal;

    private User moderatorUser;
    private UserPrincipal moderatorPrincipal;

    private final Instant fixedInstant = Instant.parse("2026-11-03T10:00:00Z");
    private final ZoneId zoneId = ZoneId.of("Asia/Ho_Chi_Minh");

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.instant()).thenReturn(fixedInstant);
        lenient().when(applicationClock.getZone()).thenReturn(zoneId);

        partnerUser = User.builder()
                .id(10L)
                .email("partner@shopee.vn")
                .phoneNumber("0900123456")
                .fullName("Shopee Rep")
                .role(Role.builder().id(5L).name("BUSINESS_PARTNER").build())
                .build();

        partnerProfile = PartnerProfile.builder()
                .id(100L)
                .user(partnerUser)
                .legalName("Công ty TNHH Shopee")
                .brandName("Shopee")
                .verificationStatus(PartnerVerificationStatus.VERIFIED)
                .officialDomain("shopee.vn")
                .officialHotline("19001234")
                .build();

        partnerPrincipal = UserPrincipal.builder()
                .id(partnerUser.getId())
                .username(partnerUser.getEmail())
                .email(partnerUser.getEmail())
                .role("BUSINESS_PARTNER")
                .build();

        moderatorUser = User.builder()
                .id(20L)
                .email("moderator@scamshield.vn")
                .phoneNumber("0988776655")
                .fullName("Kiểm Duyệt Viên An Ninh")
                .role(Role.builder().id(2L).name("MODERATOR").build())
                .build();

        moderatorPrincipal = UserPrincipal.builder()
                .id(moderatorUser.getId())
                .username(moderatorUser.getEmail())
                .role("MODERATOR")
                .build();
    }

    @Test
    @DisplayName("Đối tác gửi thông tin tình báo đe dọa kèm chứng cứ thành công -> Trạng thái PENDING, bằng chứng được lưu")
    void submitAlertOrIntel_threatIntel_success() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        MockMultipartFile file = new MockMultipartFile(
                "file", "phishing_proof.png", "image/png", "fake image bytes".getBytes());

        PartnerDocument savedDoc = PartnerDocument.builder()
                .id(777L)
                .partner(partnerProfile)
                .fileName("phishing_proof.png")
                .contentType("image/png")
                .fileSize((long) "fake image bytes".length())
                .build();
        when(partnerDocumentRepository.save(any(PartnerDocument.class))).thenReturn(savedDoc);

        when(partnerOfficialAlertRepository.save(any(PartnerOfficialAlert.class)))
                .thenAnswer(invocation -> {
                    PartnerOfficialAlert alert = invocation.getArgument(0);
                    alert.setId(501L);
                    return alert;
                });

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("THREAT_INTEL")
                .title("Phát hiện website mạo danh tuyển CTV Shopee")
                .description("Trang web lừa đảo tuyển CTV nạp tiền làm nhiệm vụ rút lãi ảo.")
                .indicatorType("WEBSITE")
                .indicatorValue("https://shopee-ctv-tuyendung.xyz/")
                .categoryCode("GIA_DANH_TMDT")
                .build();

        PartnerSubmissionResponse response = service.submitAlertOrIntel(request, file, partnerPrincipal);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(501L);
        assertThat(response.getSubmissionType()).isEqualTo("THREAT_INTEL");
        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getNormalizedValue()).isEqualTo("shopee-ctv-tuyendung.xyz");
        assertThat(response.getPartnerBrandName()).isEqualTo("Shopee");

        verify(partnerDocumentRepository).save(any(PartnerDocument.class));
        verify(partnerOfficialAlertRepository).save(argThat(a ->
                "PENDING".equals(a.getStatus()) &&
                "THREAT_INTEL".equals(a.getSubmissionType()) &&
                Long.valueOf(777L).equals(a.getEvidenceId()) &&
                a.getPartner().getId().equals(100L)
        ));
    }

    @Test
    @DisplayName("Đối tác chưa được duyệt (PENDING) không được phép gửi cảnh báo -> Ném BadRequestException")
    void submitAlertOrIntel_unverifiedPartner_throwsBadRequest() {
        partnerProfile.setVerificationStatus(PartnerVerificationStatus.PENDING);
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo giả mạo thương hiệu")
                .description("Mô tả cảnh báo")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, partnerPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("chưa được quản trị viên xác thực");

        verifyNoInteractions(partnerOfficialAlertRepository);
    }

    @Test
    @DisplayName("Kiểm duyệt viên từ chối hồ sơ (REJECT) -> Trạng thái REJECTED, ghi nhận lý do và gửi thông báo")
    void reviewSubmission_reject_success() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(501L)
                .partner(partnerProfile)
                .submissionType("THREAT_INTEL")
                .title("Nghi vấn số lạ")
                .description("[Target: PHONE:0912345678]\nSố gọi mạo danh Shopee")
                .status("PENDING")
                .build();
        when(partnerOfficialAlertRepository.findById(501L)).thenReturn(Optional.of(alert));

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.REJECT)
                .reason("Bằng chứng chưa đủ cơ sở chứng minh hành vi lừa đảo.")
                .build();

        PartnerSubmissionResponse response = service.reviewSubmission(501L, reviewRequest, moderatorPrincipal);

        assertThat(response.getStatus()).isEqualTo("REJECTED");
        assertThat(response.getReviewedByName()).isEqualTo("Kiểm Duyệt Viên An Ninh");

        verify(notificationRepository).save(argThat(n ->
                n.getUser().getId().equals(partnerUser.getId()) &&
                n.getType() == NotificationType.SYSTEM
        ));
        verify(auditLogRepository).save(argThat(l ->
                "REJECT_PARTNER_SUBMISSION".equals(l.getAction()) &&
                "REJECTED".equals(l.getNewValue()) &&
                "Bằng chứng chưa đủ cơ sở chứng minh hành vi lừa đảo.".equals(l.getReason())
        ));
        verify(indicatorRepository, never()).save(any());
        verifyNoInteractions(confirmedIndicatorRepository);
    }

    @Test
    @DisplayName("Kiểm duyệt viên xác thực tình báo (VERIFY) khi chỉ số CHƯA TỒN TẠI -> Tạo Candidate Indicator và Confirm vào Blacklist")
    void reviewSubmission_verify_threatIntel_candidateCreated_andConfirmed() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(502L)
                .partner(partnerProfile)
                .submissionType("THREAT_INTEL")
                .title("Phát hiện tên miền lừa đảo mới")
                .description("[Target: WEBSITE:https://fake-shopee-pay.xyz/ | Category: GIA_DANH_TMDT]\nChiến dịch lừa đảo mạo danh vừa xuất hiện hôm nay.")
                .status("PENDING")
                .build();
        when(partnerOfficialAlertRepository.findById(502L)).thenReturn(Optional.of(alert));

        // Chưa tồn tại trong Indicator -> Candidate created
        when(indicatorRepository.findByTypeAndNormalizedValue(IndicatorType.URL, "fake-shopee-pay.xyz"))
                .thenReturn(Optional.empty());

        Indicator candidate = Indicator.builder()
                .id(901L)
                .type(IndicatorType.URL)
                .normalizedValue("fake-shopee-pay.xyz")
                .displayValue("https://fake-shopee-pay.xyz/")
                .build();
        when(indicatorRepository.save(any(Indicator.class))).thenReturn(candidate);

        // Chưa có ConfirmedIndicator -> Confirmed if approved
        when(confirmedIndicatorRepository.findByIndicatorId(901L)).thenReturn(Optional.empty());
        when(confirmedIndicatorRepository.save(any(ConfirmedIndicator.class)))
                .thenAnswer(invocation -> {
                    ConfirmedIndicator ci = invocation.getArgument(0);
                    ci.setId(801L);
                    return ci;
                });

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Xác nhận tên miền lừa đảo trực tuyến, đã thẩm định chứng cứ.")
                .build();

        PartnerSubmissionResponse response = service.reviewSubmission(502L, reviewRequest, moderatorPrincipal);

        assertThat(response.getStatus()).isEqualTo("VERIFIED");
        assertThat(response.getIndicatorAction()).isEqualTo("CANDIDATE_CREATED");

        // Kiểm tra candidate indicator được tạo mới
        ArgumentCaptor<Indicator> indicatorCaptor = ArgumentCaptor.forClass(Indicator.class);
        verify(indicatorRepository).save(indicatorCaptor.capture());
        assertThat(indicatorCaptor.getValue().getNormalizedValue()).isEqualTo("fake-shopee-pay.xyz");
        assertThat(indicatorCaptor.getValue().getType()).isEqualTo(IndicatorType.URL);

        // Kiểm tra confirmed indicator được kích hoạt
        ArgumentCaptor<ConfirmedIndicator> confirmedCaptor = ArgumentCaptor.forClass(ConfirmedIndicator.class);
        verify(confirmedIndicatorRepository).save(confirmedCaptor.capture());
        assertThat(confirmedCaptor.getValue().getStatus()).isEqualTo(ConfirmedIndicatorStatus.ACTIVE);
        assertThat(confirmedCaptor.getValue().getImpersonatedPartner().getId()).isEqualTo(partnerProfile.getId());
        assertThat(confirmedCaptor.getValue().getConfirmedByUser().getId()).isEqualTo(moderatorUser.getId());

        // Kiểm tra thông báo và audit log
        verify(notificationRepository).save(argThat(n -> n.getType() == NotificationType.SYSTEM));
        verify(auditLogRepository).save(argThat(l -> "CONFIRM_INDICATOR_FROM_PARTNER_INTEL".equals(l.getAction())));
    }

    @Test
    @DisplayName("Kiểm duyệt viên xác thực tình báo (VERIFY) khi chỉ số ĐÃ TỒN TẠI -> Cập nhật Existing Indicator và Reactivate/Confirm Blacklist")
    void reviewSubmission_verify_threatIntel_existingIndicatorUpdated_andConfirmed() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(503L)
                .partner(partnerProfile)
                .submissionType("THREAT_INTEL")
                .title("Cập nhật hoạt động số điện thoại lừa đảo")
                .description("[Target: PHONE:0987654321]\nSố điện thoại này tiếp tục phát tán tin nhắn mạo danh.")
                .status("PENDING")
                .build();
        when(partnerOfficialAlertRepository.findById(503L)).thenReturn(Optional.of(alert));

        // Đã tồn tại Indicator
        Indicator existingIndicator = Indicator.builder()
                .id(905L)
                .type(IndicatorType.PHONE)
                .normalizedValue("0987654321")
                .displayValue("0987654321")
                .firstSeenAt(LocalDateTime.of(2025, 1, 1, 0, 0))
                .lastSeenAt(LocalDateTime.of(2025, 1, 1, 0, 0))
                .build();
        when(indicatorRepository.findByTypeAndNormalizedValue(IndicatorType.PHONE, "0987654321"))
                .thenReturn(Optional.of(existingIndicator));
        when(indicatorRepository.save(existingIndicator)).thenReturn(existingIndicator);

        // Đã có ConfirmedIndicator nhưng đang retracted/cũ
        ConfirmedIndicator existingConfirmed = ConfirmedIndicator.builder()
                .id(805L)
                .indicator(existingIndicator)
                .status(ConfirmedIndicatorStatus.RETRACTED)
                .build();
        when(confirmedIndicatorRepository.findByIndicatorId(905L)).thenReturn(Optional.of(existingConfirmed));
        when(confirmedIndicatorRepository.save(existingConfirmed)).thenReturn(existingConfirmed);

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Xác nhận tái hoạt động của đối tượng lừa đảo.")
                .build();

        PartnerSubmissionResponse response = service.reviewSubmission(503L, reviewRequest, moderatorPrincipal);

        assertThat(response.getStatus()).isEqualTo("VERIFIED");
        assertThat(response.getIndicatorAction()).isEqualTo("EXISTING_UPDATED");

        // Kiểm tra indicator được update lastSeenAt
        verify(indicatorRepository).save(argThat(i -> i.getId().equals(905L) && i.getLastSeenAt() != null));

        // Kiểm tra confirmed indicator được chuyển sang ACTIVE
        verify(confirmedIndicatorRepository).save(argThat(c ->
                c.getId().equals(805L) &&
                c.getStatus() == ConfirmedIndicatorStatus.ACTIVE &&
                c.getRetractedAt() == null
        ));
    }

    @Test
    @DisplayName("Kiểm duyệt viên xác thực cảnh báo chính thức (SCAM_ALERT) -> Xuất bản OfficialScamWarning cho cộng đồng")
    void reviewSubmission_verify_officialAlert_publishesOfficialWarning() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(504L)
                .partner(partnerProfile)
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo khẩn cấp: Giả mạo Shopee phát tán mã độc qua Telegram")
                .description("Cảnh báo người tiêu dùng không tham gia các nhóm Telegram tuyển dụng mang tên Shopee.")
                .status("PENDING")
                .build();
        when(partnerOfficialAlertRepository.findById(504L)).thenReturn(Optional.of(alert));

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Cảnh báo chính thức từ đối tác Shopee, phê duyệt phát hành toàn hệ thống.")
                .build();

        PartnerSubmissionResponse response = service.reviewSubmission(504L, reviewRequest, moderatorPrincipal);

        assertThat(response.getStatus()).isEqualTo("VERIFIED");

        // Kiểm tra xuất bản cảnh báo chính thức
        verify(officialScamWarningRepository).save(argThat(w ->
                "PUBLISHED".equals(w.getStatus()) &&
                w.getTitle().contains("Giả mạo Shopee") &&
                "Shopee".equals(w.getSourceOrganization())
        ));
    }

    @Test
    @DisplayName("Hồ sơ đã được duyệt trước đó không thể duyệt lại -> Ném BadRequestException")
    void reviewSubmission_alreadyReviewed_throwsBadRequest() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(505L)
                .partner(partnerProfile)
                .status("VERIFIED")
                .build();
        when(partnerOfficialAlertRepository.findById(505L)).thenReturn(Optional.of(alert));

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Thử duyệt lại lần 2")
                .build();

        assertThatThrownBy(() -> service.reviewSubmission(505L, reviewRequest, moderatorPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Hồ sơ đã được thẩm định trước đó");

        verify(indicatorRepository, never()).save(any());
        verifyNoInteractions(confirmedIndicatorRepository);
    }

    @Test
    @DisplayName("Gửi cảnh báo có mô tả vượt quá 255 ký tự -> Ném BadRequestException")
    void submitAlertOrIntel_descriptionTooLong_throwsBadRequest() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        String longDesc = "A".repeat(300);
        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo mô tả quá dài")
                .description(longDesc)
                .indicatorType("URL")
                .indicatorValue("https://fake.com")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, partnerPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("vượt quá giới hạn 255 ký tự");

        verify(partnerOfficialAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Đối tác lấy bằng chứng: scoped theo partnerId")
    void getSubmissionEvidence_partnerScoped() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(100L)
                .partner(partnerProfile)
                .evidenceId(888L)
                .build();
        when(partnerOfficialAlertRepository.findByIdAndPartnerId(100L, partnerProfile.getId()))
                .thenReturn(Optional.of(alert));

        PartnerDocument doc = PartnerDocument.builder().id(888L).fileName("proof.png").build();
        when(partnerDocumentRepository.findById(888L)).thenReturn(Optional.of(doc));

        PartnerDocument result = service.getSubmissionEvidence(100L, partnerPrincipal);
        assertThat(result.getId()).isEqualTo(888L);
    }

    @Test
    @DisplayName("Kiểm duyệt viên lấy bằng chứng: unscoped")
    void getSubmissionEvidenceForModerator_unscoped() {
        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(101L)
                .evidenceId(999L)
                .build();
        when(partnerOfficialAlertRepository.findById(101L)).thenReturn(Optional.of(alert));

        PartnerDocument doc = PartnerDocument.builder().id(999L).fileName("mod-proof.pdf").build();
        when(partnerDocumentRepository.findById(999L)).thenReturn(Optional.of(doc));

        PartnerDocument result = service.getSubmissionEvidenceForModerator(101L);
        assertThat(result.getId()).isEqualTo(999L);
    }

    @Test
    @DisplayName("Thẩm định threat intel không có IOC -> Không tự suy diễn chỉ số từ text")
    void reviewSubmission_threatIntelWithoutIoc_doesNotDeriveIndicator() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(506L)
                .partner(partnerProfile)
                .submissionType("THREAT_INTEL")
                .title("Tình báo chiến dịch APT")
                .description("Mô tả chiến dịch nhắc tới https://benign-sample.org trong văn bản")
                .status("PENDING")
                .build();
        when(partnerOfficialAlertRepository.findById(506L)).thenReturn(Optional.of(alert));

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Phê duyệt thông tin tình báo")
                .build();

        PartnerSubmissionResponse response = service.reviewSubmission(506L, reviewRequest, moderatorPrincipal);
        assertThat(response.getStatus()).isEqualTo("VERIFIED");
        assertThat(response.getIndicatorId()).isNull();

        verify(indicatorRepository, never()).save(any());
        verifyNoInteractions(confirmedIndicatorRepository);
    }

    @Test
    @DisplayName("Nộp cảnh báo: URL sai định dạng -> throw BadRequestException")
    void submitAlertOrIntel_invalidUrlFormat_throwsBadRequestException() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo link lừa đảo")
                .description("Phát hiện link độc hại")
                .indicatorType("URL")
                .indicatorValue("invalid-domain-without-tld")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, partnerPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tên miền không đúng định dạng hợp lệ");

        verify(partnerOfficialAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nộp cảnh báo: Số điện thoại sai định dạng -> throw BadRequestException")
    void submitAlertOrIntel_invalidPhoneFormat_throwsBadRequestException() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo số mạo danh")
                .description("Số giả danh nhân viên ngân hàng")
                .indicatorType("PHONE")
                .indicatorValue("12345")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, partnerPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Số điện thoại không đúng định dạng hợp lệ");

        verify(partnerOfficialAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nộp cảnh báo: Trùng whitelist của chính tổ chức -> throw BadRequestException (hướng dẫn cung cấp link giả mạo)")
    void submitAlertOrIntel_selfWhitelistCollision_throwsBadRequestException() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        Indicator selfIndicator = Indicator.builder()
                .id(777L)
                .type(IndicatorType.URL)
                .normalizedValue("shopee.vn")
                .build();

        when(indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(eq(IndicatorType.URL), any()))
                .thenReturn(java.util.List.of(selfIndicator));

        WhitelistEntry selfWhitelist = WhitelistEntry.builder()
                .id(1L)
                .partner(partnerProfile) // same partner
                .indicator(selfIndicator)
                .verificationStatus("VERIFIED")
                .build();

        when(whitelistEntryRepository.findVerifiedForCheck(eq(java.util.List.of(777L)), eq(PartnerVerificationStatus.VERIFIED), any()))
                .thenReturn(java.util.List.of(selfWhitelist));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo mạo danh Shopee")
                .description("Bị kẻ gian mạo danh")
                .indicatorType("URL")
                .indicatorValue("shopee.vn")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, partnerPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("tài nguyên số chính thức đã được bảo hộ của chính quý đơn vị");

        verify(partnerOfficialAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nộp cảnh báo: Trùng whitelist của đối tác khác -> throw PartnerSubmissionConflictException (HTTP 409)")
    void submitAlertOrIntel_partnerOnPartnerCollision_throwsConflictException() {
        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(partnerProfile));

        PartnerProfile otherPartner = PartnerProfile.builder()
                .id(200L)
                .legalName("Ngân hàng TMCP Ngoại thương Việt Nam")
                .brandName("Vietcombank")
                .build();

        Indicator vcbIndicator = Indicator.builder()
                .id(888L)
                .type(IndicatorType.URL)
                .normalizedValue("vietcombank.com.vn")
                .build();

        when(indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(eq(IndicatorType.URL), any()))
                .thenReturn(java.util.List.of(vcbIndicator));

        WhitelistEntry vcbWhitelist = WhitelistEntry.builder()
                .id(2L)
                .partner(otherPartner) // Different partner!
                .indicator(vcbIndicator)
                .verificationStatus("VERIFIED")
                .build();

        when(whitelistEntryRepository.findVerifiedForCheck(eq(java.util.List.of(888L)), eq(PartnerVerificationStatus.VERIFIED), any()))
                .thenReturn(java.util.List.of(vcbWhitelist));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo phát hiện link nghi vấn")
                .description("Phát hiện link nghi vấn Vietcombank")
                .indicatorType("URL")
                .indicatorValue("https://vietcombank.com.vn/portal")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, partnerPrincipal))
                .isInstanceOf(PartnerSubmissionConflictException.class)
                .hasMessageContaining("Thông tin đối tượng")
                .hasMessageContaining("Vietcombank");

        verify(partnerOfficialAlertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Thẩm định cảnh báo: Indicator thuộc Whitelist của đối tác -> chặn kiểm duyệt viên phê duyệt")
    void reviewSubmission_indicatorOnWhitelist_blocksModeratorApproval() {
        when(userRepository.findById(20L)).thenReturn(Optional.of(moderatorUser));

        PartnerProfile vcbPartner = PartnerProfile.builder()
                .id(200L)
                .legalName("Ngân hàng TMCP Ngoại thương Việt Nam")
                .brandName("Vietcombank")
                .build();

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .id(507L)
                .partner(partnerProfile)
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo Vietcombank")
                .description("[Target: URL:vietcombank.com.vn | Category: PHISHING]\nTrang web nghi vấn")
                .status("PENDING")
                .build();
        when(partnerOfficialAlertRepository.findById(507L)).thenReturn(Optional.of(alert));

        Indicator vcbIndicator = Indicator.builder()
                .id(888L)
                .type(IndicatorType.URL)
                .normalizedValue("vietcombank.com.vn")
                .build();

        when(indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(eq(IndicatorType.URL), any()))
                .thenReturn(java.util.List.of(vcbIndicator));

        WhitelistEntry vcbWhitelist = WhitelistEntry.builder()
                .id(2L)
                .partner(vcbPartner)
                .indicator(vcbIndicator)
                .verificationStatus("VERIFIED")
                .build();

        when(whitelistEntryRepository.findVerifiedForCheck(eq(java.util.List.of(888L)), eq(PartnerVerificationStatus.VERIFIED), any()))
                .thenReturn(java.util.List.of(vcbWhitelist));

        ReviewPartnerSubmissionRequest reviewRequest = ReviewPartnerSubmissionRequest.builder()
                .decision(ReviewPartnerSubmissionRequest.DecisionType.VERIFY)
                .reason("Duyệt chỉ số")
                .build();

        assertThatThrownBy(() -> service.reviewSubmission(507L, reviewRequest, moderatorPrincipal))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể phê duyệt cảnh báo")
                .hasMessageContaining("đối tác thành viên [Vietcombank]");

        verify(confirmedIndicatorRepository, never()).save(any());
    }
}
