package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.dto.request.EvidenceItemDto;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.UnauthorizedException;
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
    @Mock private ReportRepository reports;
    @Mock private ReportEvidenceRepository evidences;
    @Mock private IndicatorRepository indicators;
    @Mock private ScamCategorieRepository categories;
    @Mock private UserRepository users;
    @Mock private SupabaseStorageService storage;
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
    void rejectsOwnPhoneForJsonSubmissionAndFormattedStoredNumber() {
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
    @ValueSource(strings = {"PHONE", "BANK_ACCOUNT", "WEBSITE"})
    void allowsOtherPhonesAndDoesNotInferBankOrWebsiteOwnership(String type) {
        String target = switch (type) {
            case "PHONE" -> "0987654321";
            case "BANK_ACCOUNT" -> "0912345678";
            default -> "https://example.com";
        };
        User reporter = reporter("0912345678");
        when(users.findById(1L)).thenReturn(Optional.of(reporter));
        when(indicators.findByTypeAndNormalizedValue(type, target))
                .thenReturn(Optional.of(Indicator.builder().type(type).displayValue(target).build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });

        var result = service.createReport(request(type, target), null, principal());

        assertEquals("PENDING", result.getStatus());
        assertEquals(42L, result.getId());
        assertEquals(0, result.getRewardPoints());
        assertEquals(100, reporter.getReputationPoints());
        verify(users, never()).save(any());
        verify(reports).save(any(Report.class));
        verifyNoInteractions(storage);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {" \n\t ", "  Tin nhắn gốc:\nChuyển tiền để xác minh tài khoản.  "})
    void storesOptionalReportedMessageSeparatelyFromDescription(String message) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findByTypeAndNormalizedValue("PHONE", "0987654321"))
                .thenReturn(Optional.of(Indicator.builder().type("PHONE").displayValue("0987654321").build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setReportedMessage(message);

        var response = service.createReport(request, null, principal());

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
        when(reports.findById(42L)).thenReturn(Optional.of(Report.builder().id(42L)
                .description("Mô tả sự việc").reportedMessage(message).build()));
        when(evidences.findByReportId(42L)).thenReturn(List.of());

        var response = service.getReportById(42L);

        assertEquals(message, response.getReportedMessage());
        assertEquals("Mô tả sự việc", response.getDescription());
    }

    @ParameterizedTest
    @ValueSource(strings = {"01", "79", " 01 "})
    void storesRequiredProvinceCodeAndReturnsIt(String regionCode) {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findByTypeAndNormalizedValue("PHONE", "0987654321"))
                .thenReturn(Optional.of(Indicator.builder().type("PHONE").displayValue("0987654321").build()));
        when(categories.findByCode("OTHER"))
                .thenReturn(Optional.of(ScamCategory.builder().name("Khác").build()));
        when(reports.save(any(Report.class))).thenAnswer(invocation -> {
            Report report = invocation.getArgument(0);
            report.setId(42L);
            return report;
        });
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setRegionCode(regionCode);

        var response = service.createReport(request, null, principal());

        String expected = regionCode == null || regionCode.isBlank() ? null : regionCode.strip();
        ArgumentCaptor<Report> saved = ArgumentCaptor.forClass(Report.class);
        verify(reports).save(saved.capture());
        assertEquals(expected, saved.getValue().getRegionCode());
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
        assertEquals(expected, saved.getValue().getEvidenceType());
        assertEquals(name, saved.getValue().getFileName());
        assertEquals(expected, response.getEvidences().get(0).getEvidenceType());
    }

    @ParameterizedTest
    @CsvSource({"proof.jpg,JPG", "proof.jpeg,JPG", "proof%2EPNG?token=123#preview,PNG", "proof.PDF?download=1,PDF"})
    void infersSpecificFormatForBothJsonAttachmentForms(String suffix, String expected) {
        stubEvidenceSubmission();
        when(evidences.save(any(ReportEvidence.class))).thenAnswer(invocation -> invocation.getArgument(0));
        String url = "https://files.example/" + suffix;
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setEvidences(List.of(EvidenceItemDto.builder().fileUrl(url).build()));
        request.setAttachmentUrls(List.of(url));

        var response = service.createReport(request, null, principal());

        assertEquals(2, response.getEvidenceCount());
        response.getEvidences().forEach(evidence -> assertEquals(expected, evidence.getEvidenceType()));
        verifyNoInteractions(storage);
    }

    @ParameterizedTest
    @CsvSource({"jpeg,JPG", "png,PNG", "pdf,PDF"})
    void acceptsExplicitFormatWhenUrlHasNoExtension(String declared, String expected) {
        stubEvidenceSubmission();
        when(evidences.save(any(ReportEvidence.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setEvidences(List.of(EvidenceItemDto.builder()
                .fileUrl("https://files.example/download/123").evidenceType(declared).build()));

        var response = service.createReport(request, null, principal());

        assertEquals(expected, response.getEvidences().get(0).getEvidenceType());
    }

    @ParameterizedTest
    @CsvSource({"IMAGE,proof.png", "PNG,proof.pdf", "PDF,proof.exe"})
    void rejectsUnsupportedOrConflictingFormats(String declared, String name) {
        stubEvidenceSubmission();
        CreateReportRequest request = request("PHONE", "0987654321");
        request.setEvidences(List.of(EvidenceItemDto.builder().fileUrl("https://files.example/" + name)
                .fileName(name).evidenceType(declared).build()));

        assertThrows(BadRequestException.class, () -> service.createReport(request, null, principal()));

        verify(evidences, never()).save(any());
        verifyNoInteractions(storage);
    }

    private void stubEvidenceSubmission() {
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
        when(indicators.findByTypeAndNormalizedValue("PHONE", "0987654321"))
                .thenReturn(Optional.of(Indicator.builder().type("PHONE").displayValue("0987654321").build()));
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
