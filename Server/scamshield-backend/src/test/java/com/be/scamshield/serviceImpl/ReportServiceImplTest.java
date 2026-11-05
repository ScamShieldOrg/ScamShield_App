package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;

import com.be.scamshield.constant.VietnamProvince;

import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.exception.UnauthorizedException;
import org.springframework.test.util.ReflectionTestUtils;
import com.be.scamshield.config.ReportPrivacyProperties;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.ReportEvidenceRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.repository.ScamCategorieRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceImplTest {
    @Mock private org.springframework.context.ApplicationEventPublisher events;
    @Mock private ReportPrivacyProperties reportPrivacyProperties;
    @ParameterizedTest
    @ValueSource(strings = {"PHONE", "BANK_ACCOUNT", "URL"})
    void acceptsAllStandardIndicatorTypes(String type) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.valueOf(type), "external.example"))
                .thenReturn(Optional.of(Indicator.builder().type(IndicatorType.valueOf(type)).normalizedValue("external.example").build()));
        when(categories.findByCode("OTHER")).thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report saved = invocation.getArgument(0);
            saved.setId(42L);
            return saved;
        });
        assertEquals(type, service.createReport(request(type, "external.example"), validFiles(), principal()).getThreatType());
    }

    @Test
    void rejectsUnknownIndicatorTypeBeforePersistingAnything() {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        assertThrows(BadRequestException.class, () -> service.createReport(request("INVALID", "example.test"), null, principal()));
        verifyNoInteractions(reports, indicators, evidences, storage);
    }

    @Test
    void detailNeverReadsForeignReportOrItsEvidence() {
        when(reports.findByIdAndReporterUserId(42L, 1L)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.getReportById(42L, principal()));
        verify(reports, never()).findById(any());
        verifyNoInteractions(evidences);
    }

    @Test
    void detailRequiresAuthenticatedCallerEvenWhenInvokedDirectly() {
        assertThrows(UnauthorizedException.class,
                () -> service.getReportById(42L, null));
        verifyNoInteractions(reports, evidences);
    }

    @Test
    void clientSignalHashDependsOnSecretKey() {
        when(reportPrivacyProperties.getIpHashSecret()).thenReturn("first-test-key");
        String first = ReflectionTestUtils.invokeMethod(service, "hashClientSignal", "192.0.2.1");
        when(reportPrivacyProperties.getIpHashSecret()).thenReturn("second-test-key");
        String second = ReflectionTestUtils.invokeMethod(service, "hashClientSignal", "192.0.2.1");
        assertEquals(64, first.length());
        assertNotEquals(first, second);
    }

    @Mock private ReportRepository reports;
    @Mock private ReportEvidenceRepository evidences;
    @Mock private IndicatorRepository indicators;
    @Mock private ScamCategorieRepository categories;
    @Mock private UserRepository users;
    @Mock private SupabaseStorageService storage;
    @Mock private ReportAssignmentService reviewAssignments;

    @Mock private EvidenceAnalysisQueueService evidenceAnalysis;

    @InjectMocks private ReportServiceImpl service;

    @ParameterizedTest
    @ValueSource(strings = {"0912345678", " 0912 345 678 ", "+84912345678", "+84 (912) 345-678",
            "84912345678", "0084912345678", "0912\u00a0345\u00a0678",
            "+84 (0)912 345 678", "0084 (0)912 345 678", "84 (0)912 345 678"})
    void rejectsOwnPhoneBeforeSavingOrUploading(String target) {
        User reporter = reporter("0912345678");
        when(users.findById(1L)).thenReturn(Optional.of(reporter));
        var file = new MockMultipartFile("files", "proof.png", "image/png", new byte[]{1, 2, 3});

        BadRequestException error = assertThrows(BadRequestException.class,
                () -> service.createReport(request("PHONE", target), List.of(file), principal()));

        assertEquals("Không thể tự báo cáo chính mình.", error.getMessage());
        assertEquals(100, reporter.getReputationPoints());
        verify(users, never()).save(any());
        verifyNoInteractions(reports, evidences, indicators, categories, storage);
    }

    @Test
    void rejectsOwnPhoneWithFormattedStoredNumber() {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("+84 912 345 678")));
        assertThrows(BadRequestException.class,
                () -> service.createReport(request("PHONE", "0912345678"), null, principal()));
        verifyNoInteractions(reports, evidences, indicators, categories, storage);
    }

    @Test
    void checksAuthenticationBeforeCreatingAnything() {
        assertThrows(UnauthorizedException.class,
                () -> service.createReport(request("PHONE", "0912345678"), null, null));
        verifyNoInteractions(users, reports, evidences, indicators, categories, storage);
    }

    @ParameterizedTest
    @ValueSource(strings = {"PHONE", "BANK_ACCOUNT", "URL"})
    void allowsOtherPhonesAndDoesNotInferBankOrWebsiteOwnership(String type) {
        String target = switch (type) {
            case "PHONE" -> "0987654321";
            case "BANK_ACCOUNT" -> "0912345678";
            default -> "https://example.com";
        };
        User reporter = reporter("0912345678");
        when(users.findById(1L)).thenReturn(Optional.of(reporter));
        when(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.valueOf(type), target))
                .thenReturn(Optional.of(Indicator.builder().type(IndicatorType.valueOf(type)).displayValue(target).build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });

        var result = service.createReport(request(type, target), validFiles(), principal());

        assertEquals("PENDING", result.getStatus());
        assertEquals(42L, result.getId());
        assertEquals(0, result.getRewardPoints());
        assertEquals(100, reporter.getReputationPoints());
        verify(users, never()).save(any());
        verify(reports).save(any(Report.class));
        verify(storage).uploadFile(any(MultipartFile.class), org.mockito.ArgumentMatchers.eq("evidences"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \n\t ", "  Tin nhắn gốc:\nChuyển tiền để xác minh tài khoản.  "})
    void storesOptionalReportedMessageSeparatelyFromDescription(String message) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.PHONE, "0987654321"))
                .thenReturn(Optional.of(Indicator.builder().type(IndicatorType.PHONE).displayValue("0987654321").build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setReportedMessage(message);

        var response = service.createReport(request, validFiles(), principal());

        String expectedMessage = message == null || message.isBlank() ? null : message;
        ArgumentCaptor<Report> saved = ArgumentCaptor.forClass(Report.class);
        verify(reports).save(saved.capture());
        assertEquals("Nội dung báo cáo", saved.getValue().getDescription());
        assertEquals(expectedMessage, saved.getValue().getReportedMessage());
        assertEquals(expectedMessage, response.getReportedMessage());
        assertEquals("Nội dung báo cáo", response.getDescription());
    }

    @Test
    void detailResponseIncludesOriginalMultilineMessageLongerThan255Characters() {
        String message = "  Nội dung gốc\n" + "Đề nghị chuyển tiền. ".repeat(30);
        when(reports.findByIdAndReporterUserId(42L, 1L)).thenReturn(Optional.of(Report.builder().id(42L)
                .description("Mô tả sự việc").reportedMessage(message).build()));
        when(evidences.findByReportId(42L)).thenReturn(List.of());

        var response = service.getReportById(42L, principal());

        assertEquals(message, response.getReportedMessage());
        assertEquals("Mô tả sự việc", response.getDescription());
    }

    @ParameterizedTest
    @ValueSource(strings = {"01", "79", " 01 "})
    void storesRequiredProvinceCodeAndReturnsIt(String regionCode) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.PHONE, "0987654321"))
                .thenReturn(Optional.of(Indicator.builder().type(IndicatorType.PHONE).displayValue("0987654321").build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setRegionCode(regionCode);

        var response = service.createReport(request, validFiles(), principal());

        String expected = regionCode == null || regionCode.isBlank() ? null : regionCode.strip();
        ArgumentCaptor<Report> saved = ArgumentCaptor.forClass(Report.class);
        verify(reports).save(saved.capture());
        assertEquals(VietnamProvince.fromCode(expected).orElseThrow(), saved.getValue().getRegionCode());
        assertEquals(expected, response.getRegionCode());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "00", "99", "1", "Hà Nội"})
    void rejectsInvalidProvinceBeforeSavingOrUploading(String regionCode) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setRegionCode(regionCode);

        assertThrows(BadRequestException.class, () -> service.createReport(request, null, principal()));

        verifyNoInteractions(reports, evidences, indicators, categories, storage);
    }

    @ParameterizedTest
    @CsvSource({"proof.jpg,JPG", "proof.JPEG,JPG", "proof.PNG,PNG", "proof.pdf,PDF"})
    void storesSpecificFormatForMultipartFiles(String name, String expected) {
        stubEvidenceSubmission();
        when(evidences.save(any(ReportEvidence.class))).thenAnswer(invocation -> invocation.getArgument(0));
        MockMultipartFile file = new MockMultipartFile("files", name, "application/octet-stream", new byte[]{1});
        when(storage.uploadFile(file, "evidences"))
                .thenReturn(new SupabaseStorageService.UploadResult("https://files.example/" + name, "hash", "key", name));

        var response = service.createReport(request("PHONE", "0987654321"), List.of(file), principal());

        ArgumentCaptor<ReportEvidence> saved = ArgumentCaptor.forClass(ReportEvidence.class);
        verify(evidences).save(saved.capture());
        assertEquals(ReportEvidenceType.valueOf(expected), saved.getValue().getEvidenceType());
        assertEquals(name, saved.getValue().getFileName());
        assertEquals(expected, response.getEvidences().get(0).getEvidenceType());
    }

    @Test
    void requiresAtLeastOneUploadedFileBeforeCreatingAnything() {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        for (List<MultipartFile> files : java.util.Arrays.<List<MultipartFile>>asList(null, List.of())) {
            assertThrows(BadRequestException.class,
                    () -> service.createReport(request("PHONE", "0987654321"), files, principal()));
        }
        verifyNoInteractions(reports, indicators, categories, evidences, storage);
    }

    @Test
    void rejectsNullOrEmptyFileEvenAlongsideAValidFile() {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        MultipartFile valid = new MockMultipartFile("files", "proof.png", "image/png", new byte[]{1});
        MultipartFile empty = new MockMultipartFile("files", "empty.png", "image/png", new byte[0]);
        for (List<MultipartFile> files : List.of(java.util.Arrays.asList((MultipartFile) null),
                List.of(empty), List.of(valid, empty))) {
            assertThrows(BadRequestException.class,
                    () -> service.createReport(request("PHONE", "0987654321"), files, principal()));
        }
        verifyNoInteractions(reports, indicators, categories, evidences, storage);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"proof.exe", "proof.txt", "proof"})
    void rejectsUnsupportedFileNameBeforeCreatingAnything(String name) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        MultipartFile file = new MockMultipartFile("files", name, "application/octet-stream", new byte[]{1});
        assertThrows(BadRequestException.class,
                () -> service.createReport(request("PHONE", "0987654321"), List.of(file), principal()));
        verifyNoInteractions(reports, indicators, categories, evidences, storage);
    }

    private List<MultipartFile> validFiles() {
        MultipartFile file = new MockMultipartFile("files", "proof.png", "image/png", new byte[]{1});
        when(storage.uploadFile(file, "evidences"))
                .thenReturn(new SupabaseStorageService.UploadResult("https://files.example/proof.png", "hash", "key", "proof.png"));
        when(evidences.save(any(ReportEvidence.class))).thenAnswer(invocation -> invocation.getArgument(0));
        return List.of(file);
    }

    private void stubEvidenceSubmission() {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.PHONE, "0987654321"))
                .thenReturn(Optional.of(Indicator.builder().type(IndicatorType.PHONE).displayValue("0987654321").build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });
    }

    private User reporter(String phone) {
        return User.builder().id(1L).phoneNumber(phone).reputationPoints(100).build();
    }

    private UserPrincipal principal() {
        return UserPrincipal.builder().id(1L).build();
    }

    private CreateReportRequest request(String type, String target) {
        return CreateReportRequest.builder().threatType(type).targetIdentifier(target)
                .regionCode("01").category("OTHER").description("Nội dung báo cáo").isConfirmed(true).build();
    }
}
