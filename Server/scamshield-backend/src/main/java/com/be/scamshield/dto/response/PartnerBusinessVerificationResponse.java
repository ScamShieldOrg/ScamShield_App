package com.be.scamshield.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PartnerBusinessVerificationResponse(
        Outcome outcome,
        LocalDateTime checkedAt,
        String submittedLegalName,
        String submittedTaxCode,
        RegistryResult xinvoice,
        MatchResult formNameVsXinvoice,
        MatchResult formTaxCodeVsXinvoice,
        List<DocumentResult> documents,
        boolean ocrEnabled) {

    public enum Outcome { MATCHED, REVIEW_REQUIRED }
    public enum SourceStatus { SUCCESS, NOT_FOUND, UNREADABLE, UNAVAILABLE, NOT_CONFIGURED, NOT_CHECKED, DISABLED }
    public enum MatchResult { MATCHED, MISMATCH, INCONCLUSIVE }
    public enum ActivityStatus { ACTIVE, NOT_ACTIVE, REVIEW_REQUIRED, UNKNOWN }

    public record RegistryResult(SourceStatus status, String legalName, String taxCode,
                                 String businessStatus, ActivityStatus activityStatus, String providerUpdatedAt) { }

    public record ExtractedBusiness(String legalName, String taxCode,
                                    Double legalNameConfidence, Double taxCodeConfidence) { }

    public record DocumentResult(String fileName, SourceStatus status, List<ExtractedBusiness> extractedBusinesses,
                                 MatchResult formNameVsOcr, MatchResult formTaxCodeVsOcr,
                                 MatchResult xinvoiceNameVsOcr, MatchResult xinvoiceTaxCodeVsOcr) { }
}
