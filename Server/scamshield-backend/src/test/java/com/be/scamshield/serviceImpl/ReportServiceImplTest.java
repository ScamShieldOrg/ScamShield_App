package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
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
        when(users.findById(1L)).thenReturn(Optional.of(reporter("0912345678")));
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
        verify(reports).save(any(Report.class));
        verifyNoInteractions(storage);
    }

    private User reporter(String phone) {
        return User.builder().id(1L).phoneNumber(phone).reputationPoints(100).build();
    }

    private UserPrincipal principal() {
        return UserPrincipal.builder().id(1L).build();
    }

    private CreateReportRequest request(String type, String target) {
        return CreateReportRequest.builder().threatType(type).targetIdentifier(target)
                .category("OTHER").description("Nội dung báo cáo").isConfirmed(true).build();
    }
}
