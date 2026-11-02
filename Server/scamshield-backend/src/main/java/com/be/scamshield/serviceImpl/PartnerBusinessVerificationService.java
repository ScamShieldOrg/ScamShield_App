package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.BusinessLicenseOcrClient;
import com.be.scamshield.external.XinvoiceBusinessClient;

import com.be.scamshield.config.PartnerBusinessVerificationProperties;
import com.be.scamshield.dto.BusinessDocumentOcr;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ActivityStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.DocumentResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ExtractedBusiness;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.MatchResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.Outcome;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.RegistryResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import com.be.scamshield.entity.PartnerDocument;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.function.Function;
import java.util.concurrent.TimeUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PartnerBusinessVerificationService {
    private static final Set<String> ACTIVE_STATUSES = Set.of(
            "NNT ĐANG HOẠT ĐỘNG", "NNT ĐANG HOẠT ĐỘNG (ĐÃ ĐƯỢC CẤP GCN ĐKT)");
    private static final Set<String> OTHER_KNOWN_STATUSES = Set.of(
            "ĐỢI PHẢN HỒI ĐKDN", "MÃ SỐ THUẾ CHỜ CẬP NHẬT THÔNG TIN SỐ ĐỊNH DANH CÁ NHÂN",
            "NNT CHỜ XÁC MINH TÌNH TRẠNG HOẠT ĐỘNG TẠI ĐỊA CHỈ ĐÃ ĐĂNG KÝ",
            "NNT ĐÃ CHUYỂN CƠ QUAN THUẾ QUẢN LÝ", "NNT ĐANG HOẠT ĐỘNG (CHƯA ĐẦY ĐỦ THỦ TỤC CẤP MST)",
            "NNT KHÔNG HOẠT ĐỘNG TẠI ĐỊA CHỈ ĐÃ ĐĂNG KÝ",
            "NNT NGỪNG HĐ NHƯNG CHƯA HOÀN THÀNH THỦ TỤC CHẤM DỨT HIỆU LỰC MST",
            "NNT NGỪNG HOẠT ĐỘNG VÀ ĐÃ ĐÓNG MST",
            "NNT NGỪNG HOẠT ĐỘNG VÀ ĐÃ HOÀN THÀNH THỦ TỤC CHẤM DỨT HIỆU LỰC MST",
            "NNT TẠM NGỪNG KD CÓ THỜI HẠN");

    private final XinvoiceBusinessClient xinvoiceClient;
    private final BusinessLicenseOcrClient ocrClient;
    private final PartnerBusinessVerificationProperties properties;
    private final Clock applicationClock;

    public PartnerBusinessVerificationResponse verify(String legalName, String taxCode, List<PartnerDocument> documents) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(properties.getTotalBudgetSeconds());
        var lookup = xinvoiceClient.lookup(taxCode);
        RegistryResult registry = new RegistryResult(lookup.status(), lookup.legalName(), lookup.taxCode(),
                lookup.businessStatus(), activity(lookup.businessStatus()), lookup.updatedAt());
        MatchResult formName = lookup.status() == SourceStatus.SUCCESS
                ? compare(legalName, lookup.legalName(), this::normalizeName) : MatchResult.INCONCLUSIVE;
        MatchResult formTaxCode = lookup.status() == SourceStatus.SUCCESS
                ? compare(taxCode, lookup.taxCode(), this::normalizeTaxCode) : MatchResult.INCONCLUSIVE;
        boolean registryPassed = formName == MatchResult.MATCHED && formTaxCode == MatchResult.MATCHED
                && registry.activityStatus() == ActivityStatus.ACTIVE;
        List<DocumentResult> documentResults = documents.stream()
                .filter(document -> "BUSINESS_LICENSE".equals(document.getDocumentType()))
                .map(document -> verifyDocument(document, legalName, taxCode, registry, deadline, registryPassed)).toList();
        boolean documentsMatched = !documentResults.isEmpty()
                && documentResults.stream().allMatch(document -> document.status() == SourceStatus.SUCCESS
                    && document.formNameVsOcr() == MatchResult.MATCHED && document.formTaxCodeVsOcr() == MatchResult.MATCHED
                    && document.xinvoiceNameVsOcr() == MatchResult.MATCHED && document.xinvoiceTaxCodeVsOcr() == MatchResult.MATCHED);
        // TODO: Restore mandatory three-source checks by enabling OCR once provider credentials are available.
        boolean matched = registryPassed && (!properties.getOcr().isEnabled() || documentsMatched);
        return new PartnerBusinessVerificationResponse(matched ? Outcome.MATCHED : Outcome.REVIEW_REQUIRED,
                LocalDateTime.now(applicationClock), legalName, taxCode, registry, formName, formTaxCode,
                documentResults, properties.getOcr().isEnabled());
    }

    private DocumentResult verifyDocument(PartnerDocument document, String legalName, String taxCode, RegistryResult registry,
                                           long deadline, boolean registryPassed) {
        // Avoid paid OCR calls when registry checks already prevent registration.
        BusinessDocumentOcr ocr = !properties.getOcr().isEnabled() ? BusinessDocumentOcr.unavailable(SourceStatus.DISABLED)
                : !registryPassed ? BusinessDocumentOcr.unavailable(SourceStatus.NOT_CHECKED)
                : System.nanoTime() < deadline
                ? ocrClient.extract(document.getContent(), document.getFileName())
                : BusinessDocumentOcr.unavailable(SourceStatus.UNAVAILABLE);
        String registryName = registry.status() == SourceStatus.SUCCESS ? registry.legalName() : null;
        String registryTaxCode = registry.status() == SourceStatus.SUCCESS ? registry.taxCode() : null;
        return new DocumentResult(document.getFileName(), ocr.status(), ocr.businesses(),
                compareOcr(legalName, ocr, ExtractedBusiness::legalName, ExtractedBusiness::legalNameConfidence, this::normalizeName),
                compareOcr(taxCode, ocr, ExtractedBusiness::taxCode, ExtractedBusiness::taxCodeConfidence, this::normalizeTaxCode),
                compareOcr(registryName, ocr, ExtractedBusiness::legalName, ExtractedBusiness::legalNameConfidence, this::normalizeName),
                compareOcr(registryTaxCode, ocr, ExtractedBusiness::taxCode, ExtractedBusiness::taxCodeConfidence, this::normalizeTaxCode));
    }

    private MatchResult compareOcr(String expected, BusinessDocumentOcr ocr,
                                   Function<ExtractedBusiness, String> value,
                                   Function<ExtractedBusiness, Double> confidence, Function<String, String> normalizer) {
        if (ocr.status() != SourceStatus.SUCCESS || normalizer.apply(expected).isEmpty()) { return MatchResult.INCONCLUSIVE; }
        boolean found = false;
        boolean uncertain = false;
        for (ExtractedBusiness business : ocr.businesses()) {
            String extracted = value.apply(business);
            if (extracted == null || extracted.isBlank()) { continue; }
            found = true;
            Double certainty = confidence.apply(business);
            if (certainty == null || certainty < properties.getMinimumOcrConfidence()) {
                uncertain = true;
                continue;
            }
            MatchResult result = compare(expected, extracted, normalizer);
            if (result == MatchResult.MISMATCH) { return result; }
            if (result == MatchResult.INCONCLUSIVE) { uncertain = true; }
        }
        return found && !uncertain ? MatchResult.MATCHED : MatchResult.INCONCLUSIVE;
    }

    private MatchResult compare(String left, String right, Function<String, String> normalizer) {
        String normalizedLeft = normalizer.apply(left);
        String normalizedRight = normalizer.apply(right);
        if (normalizedLeft.isEmpty() || normalizedRight.isEmpty()) { return MatchResult.INCONCLUSIVE; }
        return normalizedLeft.equals(normalizedRight) ? MatchResult.MATCHED : MatchResult.MISMATCH;
    }

    private String normalizeName(String name) {
        if (name == null) { return ""; }
        // Preserve Vietnamese accents and legal entity wording; do not fuzzy-match different businesses.
        return Normalizer.normalize(name, Normalizer.Form.NFC).toUpperCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{M}\\p{N}]", " ").replaceAll("\\s+", " ").trim();
    }

    private String normalizeTaxCode(String taxCode) {
        if (taxCode == null) { return ""; }
        String normalized = taxCode.replaceAll("[\\s-]", "");
        return normalized.matches("[0-9]{10}([0-9]{3})?") ? normalized : "";
    }

    private ActivityStatus activity(String status) {
        String normalized = status == null ? "" : Normalizer.normalize(status, Normalizer.Form.NFC)
                .toUpperCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
        if (ACTIVE_STATUSES.contains(normalized)) { return ActivityStatus.ACTIVE; }
        if (!OTHER_KNOWN_STATUSES.contains(normalized)) { return ActivityStatus.UNKNOWN; }
        return normalized.startsWith("NNT NGỪNG ") || normalized.startsWith("NNT TẠM NGỪNG ")
                || normalized.startsWith("NNT KHÔNG HOẠT ĐỘNG ")
                ? ActivityStatus.NOT_ACTIVE : ActivityStatus.REVIEW_REQUIRED;
    }
}
