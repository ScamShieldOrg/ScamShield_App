package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.BusinessLicenseOcrClient;
import com.be.scamshield.external.XinvoiceBusinessClient;

import com.be.scamshield.config.PartnerBusinessVerificationProperties;
import com.be.scamshield.dto.BusinessDocumentOcr;
import com.be.scamshield.dto.BusinessRegistryLookup;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ActivityStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ExtractedBusiness;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.MatchResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.Outcome;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import com.be.scamshield.entity.PartnerDocument;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Clock;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;

class PartnerBusinessVerificationServiceTest {
    private XinvoiceBusinessClient registry;
    private BusinessLicenseOcrClient ocr;
    private PartnerBusinessVerificationService service;
    private PartnerBusinessVerificationProperties properties;
    private final List<PartnerDocument> files = List.of(PartnerDocument.builder()
            .fileName("license.pdf").documentType("BUSINESS_LICENSE").content("%PDF-license".getBytes(StandardCharsets.US_ASCII)).build());

    @BeforeEach
    void setUp() {
        registry = mock(XinvoiceBusinessClient.class);
        ocr = mock(BusinessLicenseOcrClient.class);
        properties = new PartnerBusinessVerificationProperties();
        properties.getOcr().setEnabled(true);
        service = new PartnerBusinessVerificationService(registry, ocr, properties, Clock.systemUTC());
        when(registry.lookup(any())).thenReturn(lookup("NNT đang hoạt động"));
        when(ocr.extract(any(), any())).thenReturn(extracted("CÔNG TY ABC", "0100112437", 0.99));
    }

    @Test
    void deferredOcrAllowsRegistryMatchedRegistrationAndNeverClaimsPdfMatched() {
        properties.getOcr().setEnabled(false);
        assertThat(new PartnerBusinessVerificationProperties().getOcr().isEnabled()).isFalse();
        var result = service.verify("Công ty ABC", "0100112437", files);
        assertThat(result.outcome()).isEqualTo(Outcome.MATCHED);
        assertThat(result.ocrEnabled()).isFalse();
        assertThat(result.documents().getFirst().status()).isEqualTo(SourceStatus.DISABLED);
        assertThat(result.documents().getFirst().formNameVsOcr()).isEqualTo(MatchResult.INCONCLUSIVE);
        assertThat(result.documents().getFirst().formTaxCodeVsOcr()).isEqualTo(MatchResult.INCONCLUSIVE);
        verifyNoInteractions(ocr);
    }

    @ParameterizedTest
    @ValueSource(strings = {"NNT ngừng hoạt động và đã đóng MST", "future status"})
    void disablingOcrDoesNotBypassRegistryStatus(String status) {
        properties.getOcr().setEnabled(false);
        when(registry.lookup(any())).thenReturn(lookup(status));
        assertThat(service.verify("Công ty ABC", "0100112437", files).outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
        verifyNoInteractions(ocr);
    }

    @Test
    void disablingOcrDoesNotBypassNameOrTaxCodeMismatchOrRegistryOutage() {
        properties.getOcr().setEnabled(false);
        assertThat(service.verify("Công ty khác", "0100112437", files).outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
        assertThat(service.verify("Công ty ABC", "0100112438", files).outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
        when(registry.lookup(any())).thenReturn(BusinessRegistryLookup.unavailable(SourceStatus.UNAVAILABLE));
        assertThat(service.verify("Công ty ABC", "0100112437", files).outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
        verifyNoInteractions(ocr);
    }

    @Test
    void comparesAllThreeSourcesWithoutRepresentativesAndNormalizesNames() {
        var result = service.verify("  Công ty   ABC. ", "0100112437", files);
        assertThat(result.outcome()).isEqualTo(Outcome.MATCHED);
        assertThat(result.formNameVsXinvoice()).isEqualTo(MatchResult.MATCHED);
        assertThat(result.formTaxCodeVsXinvoice()).isEqualTo(MatchResult.MATCHED);
        assertThat(result.documents().getFirst().xinvoiceNameVsOcr()).isEqualTo(MatchResult.MATCHED);
        assertThat(result.documents().getFirst().formTaxCodeVsOcr()).isEqualTo(MatchResult.MATCHED);
    }

    @Test
    void preservesVietnameseAccentsAndNormalizesUnicodeComposition() {
        when(registry.lookup(any())).thenReturn(new BusinessRegistryLookup(SourceStatus.SUCCESS, "0100112437", "CÔNG TY ÁNH", "NNT đang hoạt động", null));
        when(ocr.extract(any(), any())).thenReturn(extracted(Normalizer.normalize("CÔNG TY ÁNH", Normalizer.Form.NFD), "0100112437", 0.99));
        assertThat(service.verify("Công ty Ánh", "0100112437", files).outcome()).isEqualTo(Outcome.MATCHED);
        assertThat(service.verify("Công ty Anh", "0100112437", files).formNameVsXinvoice()).isEqualTo(MatchResult.MISMATCH);
    }

    @Test
    void normalizesBranchSeparatorWithoutMatchingParentToBranch() {
        when(registry.lookup(any())).thenReturn(new BusinessRegistryLookup(SourceStatus.SUCCESS, "0100112437-001", "CÔNG TY ABC", "NNT đang hoạt động", null));
        when(ocr.extract(any(), any())).thenReturn(extracted("CÔNG TY ABC", "0100112437-001", 0.99));
        assertThat(service.verify("Công ty ABC", "0100112437001", files).outcome()).isEqualTo(Outcome.MATCHED);
        assertThat(service.verify("Công ty ABC", "0100112437", files).formTaxCodeVsXinvoice()).isEqualTo(MatchResult.MISMATCH);
    }

    @ParameterizedTest
    @ValueSource(strings = {"NNT ngừng hoạt động và đã đóng MST", "NNT không hoạt động tại địa chỉ đã đăng ký", "NNT tạm ngừng KD có thời hạn"})
    void neverTreatsInactiveStatusesAsActive(String status) {
        when(registry.lookup(any())).thenReturn(lookup(status));
        var result = service.verify("Công ty ABC", "0100112437", files);
        assertThat(result.xinvoice().businessStatus()).isEqualTo(status);
        assertThat(result.xinvoice().activityStatus()).isEqualTo(ActivityStatus.NOT_ACTIVE);
        assertThat(result.outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
    }

    @ParameterizedTest
    @ValueSource(strings = {"NNT đang hoạt động (chưa đầy đủ thủ tục cấp MST)", "NNT đã chuyển cơ quan thuế quản lý", "Đợi phản hồi ĐKDN"})
    void requiresReviewForKnownAmbiguousStatuses(String status) {
        when(registry.lookup(any())).thenReturn(lookup(status));
        assertThat(service.verify("Công ty ABC", "0100112437", files).xinvoice().activityStatus())
                .isEqualTo(ActivityStatus.REVIEW_REQUIRED);
    }

    @Test
    void unknownOrMissingStatusCannotPass() {
        when(registry.lookup(any())).thenReturn(lookup("future status"));
        var result = service.verify("Công ty ABC", "0100112437", files);
        assertThat(result.xinvoice().activityStatus()).isEqualTo(ActivityStatus.UNKNOWN);
        assertThat(result.outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
        when(registry.lookup(any())).thenReturn(lookup(null));
        assertThat(service.verify("Công ty ABC", "0100112437", files).outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
    }

    @Test
    void keepsRegistryFailureSeparateFromDocumentMismatch() {
        when(registry.lookup(any())).thenReturn(BusinessRegistryLookup.unavailable(SourceStatus.UNAVAILABLE));
        var result = service.verify("Công ty ABC", "0100112437", files);
        assertThat(result.formNameVsXinvoice()).isEqualTo(MatchResult.INCONCLUSIVE);
        assertThat(result.documents().getFirst().formNameVsOcr()).isEqualTo(MatchResult.INCONCLUSIVE);
        assertThat(result.documents().getFirst().status()).isEqualTo(SourceStatus.NOT_CHECKED);
        verifyNoInteractions(ocr);
        assertThat(result.documents().getFirst().xinvoiceNameVsOcr()).isEqualTo(MatchResult.INCONCLUSIVE);
        assertThat(result.outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
    }

    @Test
    void missingCredentialsAndUnreadableOcrNeverPass() {
        when(registry.lookup(any())).thenReturn(BusinessRegistryLookup.unavailable(SourceStatus.NOT_CONFIGURED));
        when(ocr.extract(any(), any())).thenReturn(BusinessDocumentOcr.unavailable(SourceStatus.UNREADABLE));
        var result = service.verify("Công ty ABC", "0100112437", files);
        assertThat(result.xinvoice().status()).isEqualTo(SourceStatus.NOT_CONFIGURED);
        assertThat(result.documents().getFirst().status()).isEqualTo(SourceStatus.NOT_CHECKED);
        assertThat(result.documents().getFirst().formTaxCodeVsOcr()).isEqualTo(MatchResult.INCONCLUSIVE);
        assertThat(result.outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
    }

    @Test
    void lowConfidenceIsInconclusiveAndEveryDocumentMustMatch() {
        when(ocr.extract(any(), any())).thenReturn(extracted("CÔNG TY ABC", "0100112437", 0.5));
        assertThat(service.verify("Công ty ABC", "0100112437", files).documents().getFirst().formNameVsOcr())
                .isEqualTo(MatchResult.INCONCLUSIVE);
        when(ocr.extract(any(), any())).thenReturn(extracted("CÔNG TY ABC", "0100112437", 0.99), extracted("CÔNG TY KHÁC", "0100112438", 0.99));
        var result = service.verify("Công ty ABC", "0100112437", List.of(files.getFirst(), files.getFirst()));
        assertThat(result.documents().get(1).formNameVsOcr()).isEqualTo(MatchResult.MISMATCH);
        assertThat(result.documents().get(1).xinvoiceTaxCodeVsOcr()).isEqualTo(MatchResult.MISMATCH);
        assertThat(result.outcome()).isEqualTo(Outcome.REVIEW_REQUIRED);
    }

    @Test
    void combinesFieldsAcrossPagesButFlagsConflictingCompanyEntries() {
        when(ocr.extract(any(), any())).thenReturn(new BusinessDocumentOcr(SourceStatus.SUCCESS, List.of(
                new ExtractedBusiness("CÔNG TY ABC", null, 0.99, null),
                new ExtractedBusiness(null, "0100112437", null, 0.99))));
        assertThat(service.verify("Công ty ABC", "0100112437", files).outcome()).isEqualTo(Outcome.MATCHED);
        when(ocr.extract(any(), any())).thenReturn(new BusinessDocumentOcr(SourceStatus.SUCCESS, List.of(
                new ExtractedBusiness("CÔNG TY ABC", "0100112437", 0.99, 0.99),
                new ExtractedBusiness("CÔNG TY KHÁC", "0100112438", 0.99, 0.99))));
        assertThat(service.verify("Công ty ABC", "0100112437", files).documents().getFirst().formTaxCodeVsOcr())
                .isEqualTo(MatchResult.MISMATCH);
    }

    private BusinessRegistryLookup lookup(String status) {
        return new BusinessRegistryLookup(SourceStatus.SUCCESS, "0100112437", "CÔNG TY ABC", status, "2026-10-27T00:00:00Z");
    }

    private BusinessDocumentOcr extracted(String name, String taxCode, double confidence) {
        return new BusinessDocumentOcr(SourceStatus.SUCCESS, List.of(new ExtractedBusiness(name, taxCode, confidence, confidence)));
    }
}
