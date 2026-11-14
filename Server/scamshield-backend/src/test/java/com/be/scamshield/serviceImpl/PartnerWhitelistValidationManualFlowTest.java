package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.WhitelistVerificationStatus;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.SubmitPartnerAlertRequest;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.PartnerSubmissionConflictException;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class PartnerWhitelistValidationManualFlowTest {

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

    @InjectMocks
    private PartnerSubmissionServiceImpl service;

    private PartnerProfile shopeePartner;
    private UserPrincipal shopeePrincipal;

    private PartnerProfile vcbPartner;
    private UserPrincipal vcbPrincipal;

    private Indicator vcbDomainIndicator;
    private WhitelistEntry vcbWhitelistEntry;

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.instant()).thenReturn(Instant.parse("2026-11-14T10:00:00Z"));
        lenient().when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));

        // 1. Partner Shopee (ID = 100)
        User shopeeUser = User.builder().id(10L).fullName("Shopee Rep").email("soc@shopee.vn").build();
        shopeePartner = PartnerProfile.builder()
                .id(100L)
                .user(shopeeUser)
                .legalName("Công ty TNHH Shopee Việt Nam")
                .brandName("Shopee")
                .verificationStatus(PartnerVerificationStatus.VERIFIED)
                .officialDomain("shopee.vn")
                .build();
        shopeePrincipal = UserPrincipal.create(shopeeUser);

        // 2. Partner Vietcombank (ID = 200)
        User vcbUser = User.builder().id(20L).fullName("Vietcombank Rep").email("security@vietcombank.com.vn").build();
        vcbPartner = PartnerProfile.builder()
                .id(200L)
                .user(vcbUser)
                .legalName("Ngân hàng TMCP Ngoại thương Việt Nam")
                .brandName("Vietcombank")
                .verificationStatus(PartnerVerificationStatus.VERIFIED)
                .officialDomain("vietcombank.com.vn")
                .build();
        vcbPrincipal = UserPrincipal.create(vcbUser);

        // 3. Whitelist Entry của Vietcombank (Đã được xác thực)
        vcbDomainIndicator = Indicator.builder()
                .id(888L)
                .type(IndicatorType.URL)
                .normalizedValue("vietcombank.com.vn")
                .displayValue("vietcombank.com.vn")
                .build();

        vcbWhitelistEntry = WhitelistEntry.builder()
                .id(1L)
                .partner(vcbPartner)
                .indicator(vcbDomainIndicator)
                .verificationStatus(WhitelistVerificationStatus.VERIFIED)
                .build();
    }

    @Test
    @DisplayName("Kịch bản 1: Đối tác A (Shopee) báo cáo tên miền của Đối tác B (Vietcombank) có sẵn trong Whitelist")
    void testCase1_PartnerOnPartnerWhitelistCollision() {
        System.out.println("\n==========================================================================");
        System.out.println("TEST KỊCH BẢN 1: ĐỐI TÁC A BÁO CÁO TÊN MIỀN NẰM TRONG WHITELIST CỦA ĐỐI TÁC B");
        System.out.println("Người báo cáo : " + shopeePartner.getBrandName() + " (Partner ID: " + shopeePartner.getId() + ")");
        System.out.println("Tên miền nhập : https://vietcombank.com.vn/portal");
        System.out.println("Whitelist chủ : " + vcbPartner.getBrandName() + " (Đã thẩm định)");
        System.out.println("--------------------------------------------------------------------------");

        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(shopeePartner));
        when(indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(eq(IndicatorType.URL), any()))
                .thenReturn(List.of(vcbDomainIndicator));
        when(whitelistEntryRepository.findVerifiedForCheck(eq(List.of(888L)), eq(PartnerVerificationStatus.VERIFIED), any()))
                .thenReturn(List.of(vcbWhitelistEntry));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Nghi vấn lừa đảo mạo danh ngân hàng")
                .description("Phát hiện đường link nghi vấn lừa đảo người dùng")
                .indicatorType("URL")
                .indicatorValue("https://vietcombank.com.vn/portal")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, shopeePrincipal))
                .isInstanceOf(PartnerSubmissionConflictException.class)
                .satisfies(ex -> {
                    System.out.println("[KẾT QUẢ HTTP 409 CONFLICT]");
                    System.out.println("Thông báo lỗi hệ thống trả về:");
                    System.out.println("-> \"" + ex.getMessage() + "\"");
                    assertThat(ex.getMessage()).contains("Thông tin đối tượng");
                    assertThat(ex.getMessage()).contains("Vietcombank");
                    assertThat(ex.getMessage()).contains("đã được xác thực là kênh số chính thức");
                });

        verify(partnerOfficialAlertRepository, never()).save(any());
        System.out.println("=> [THÀNH CÔNG] Đã chặn cảnh báo ngay lập tức, không lưu vào DB, không gửi tới Moderator!");
        System.out.println("==========================================================================\n");
    }

    @Test
    @DisplayName("Kịch bản 2: Đối tác tự nhập nhầm tên miền chính thức của chính mình có trong Whitelist")
    void testCase2_SelfWhitelistCollision() {
        System.out.println("\n==========================================================================");
        System.out.println("TEST KỊCH BẢN 2: ĐỐI TÁC NHẬP NHẦM TÊN MIỀN WHITELIST CỦA CHÍNH MÌNH");
        System.out.println("Người báo cáo : " + vcbPartner.getBrandName() + " (Partner ID: " + vcbPartner.getId() + ")");
        System.out.println("Tên miền nhập : vietcombank.com.vn");
        System.out.println("--------------------------------------------------------------------------");

        when(partnerProfileRepository.findByUserId(20L)).thenReturn(Optional.of(vcbPartner));
        when(indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(eq(IndicatorType.URL), any()))
                .thenReturn(List.of(vcbDomainIndicator));
        when(whitelistEntryRepository.findVerifiedForCheck(eq(List.of(888L)), eq(PartnerVerificationStatus.VERIFIED), any()))
                .thenReturn(List.of(vcbWhitelistEntry));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo giả mạo thương hiệu")
                .description("Kẻ gian đang mạo danh cổng ngân hàng")
                .indicatorType("URL")
                .indicatorValue("vietcombank.com.vn")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, vcbPrincipal))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> {
                    System.out.println("[KẾT QUẢ HTTP 400 BAD REQUEST]");
                    System.out.println("Thông báo hướng dẫn trả về:");
                    System.out.println("-> \"" + ex.getMessage() + "\"");
                    assertThat(ex.getMessage()).contains("tài nguyên số chính thức đã được bảo hộ của chính quý đơn vị");
                    assertThat(ex.getMessage()).contains("quý đơn vị vui lòng chỉ cung cấp địa chỉ trang web mạo danh");
                });

        verify(partnerOfficialAlertRepository, never()).save(any());
        System.out.println("=> [THÀNH CÔNG] Đã hướng dẫn đối tác cung cấp đúng link phishing thay vì tên miền thương hiệu!");
        System.out.println("==========================================================================\n");
    }

    @Test
    @DisplayName("Kịch bản 3: Đối tác nhập tên miền sai định dạng / không hợp lệ")
    void testCase3_InvalidUrlSyntax() {
        System.out.println("\n==========================================================================");
        System.out.println("TEST KỊCH BẢN 3: ĐỐI TÁC NHẬP TÊN MIỀN SAI CÚ PHÁP (KHÔNG CÓ TLD)");
        System.out.println("Tên miền nhập : invalid-domain-without-tld");
        System.out.println("--------------------------------------------------------------------------");

        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(shopeePartner));

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo link lạ")
                .description("Phát hiện link không rõ nguồn gốc")
                .indicatorType("URL")
                .indicatorValue("invalid-domain-without-tld")
                .build();

        assertThatThrownBy(() -> service.submitAlertOrIntel(request, null, shopeePrincipal))
                .isInstanceOf(BadRequestException.class)
                .satisfies(ex -> {
                    System.out.println("[KẾT QUẢ HTTP 400 BAD REQUEST]");
                    System.out.println("Thông báo kiểm tra định dạng trả về:");
                    System.out.println("-> \"" + ex.getMessage() + "\"");
                    assertThat(ex.getMessage()).contains("Tên miền không đúng định dạng hợp lệ");
                });

        verify(partnerOfficialAlertRepository, never()).save(any());
        System.out.println("=> [THÀNH CÔNG] Đã chặn dữ liệu rác trước khi vào hàng đợi kiểm duyệt!");
        System.out.println("==========================================================================\n");
    }

    @Test
    @DisplayName("Kịch bản 4: Đối tác nhập link phishing hợp lệ KHÔNG nằm trong Whitelist")
    void testCase4_ValidPhishingUrlNotOnWhitelist_Success() {
        System.out.println("\n==========================================================================");
        System.out.println("TEST KỊCH BẢN 4: ĐỐI TÁC NHẬP LINK PHISHING HỢP LỆ (KHÔNG NẰM TRONG WHITELIST)");
        System.out.println("Tên miền nhập : https://vietcombank-login-otp-fake.xyz/auth/login");
        System.out.println("--------------------------------------------------------------------------");

        when(partnerProfileRepository.findByUserId(10L)).thenReturn(Optional.of(shopeePartner));
        when(indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(eq(IndicatorType.URL), any()))
                .thenReturn(List.of()); // Không trùng whitelist

        PartnerOfficialAlert savedAlert = PartnerOfficialAlert.builder()
                .id(999L)
                .partner(shopeePartner)
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo tên miền phishing")
                .description("[Target: URL:https://vietcombank-login-otp-fake.xyz/auth/login]\nPhát hiện trang lừa OTP")
                .status("PENDING")
                .build();

        when(partnerOfficialAlertRepository.save(any())).thenReturn(savedAlert);

        SubmitPartnerAlertRequest request = SubmitPartnerAlertRequest.builder()
                .submissionType("SCAM_ALERT")
                .title("Cảnh báo tên miền phishing")
                .description("Phát hiện trang lừa OTP")
                .indicatorType("URL")
                .indicatorValue("https://vietcombank-login-otp-fake.xyz/auth/login")
                .build();

        PartnerSubmissionResponse response = service.submitAlertOrIntel(request, null, shopeePrincipal);

        System.out.println("[KẾT QUẢ THÀNH CÔNG HTTP 201 CREATED]");
        System.out.println("Hồ sơ ID      : " + response.getId());
        System.out.println("Mã hồ sơ      : " + response.getSubmissionCode());
        System.out.println("Trạng thái    : " + response.getStatus());
        System.out.println("Chỉ báo lưu   : " + response.getIndicatorValue());

        assertThat(response.getStatus()).isEqualTo("PENDING");
        assertThat(response.getSubmissionCode()).isEqualTo("PAL-0999");
        verify(partnerOfficialAlertRepository).save(any());
        System.out.println("=> [THÀNH CÔNG] Hồ sơ cảnh báo hợp lệ đã được tiếp nhận và chuyển đến Moderator Queue!");
        System.out.println("==========================================================================\n");
    }
}

