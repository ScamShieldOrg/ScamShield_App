package com.be.scamshield.dto.admin;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.PartnerPasswordEmailStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPartnerRegistrationDetailResponse(Long id, Long userId, String legalName,
        String taxCode, String corporateEmail, String representativeNameAndTitle, Boolean legalRepresentative, String contactPhone,
        String officialDomain, String officialHotline, String smsBrandName,
        PartnerVerificationStatus verificationStatus, LocalDateTime createdAt, LocalDateTime reviewedAt,
        String reviewedBy, String reviewReason, PartnerPasswordEmailStatus passwordLinkEmailStatus,
        LocalDateTime passwordSetupCompletedAt, PartnerBusinessVerificationResponse businessVerification,
        String documentVerificationStatus,
        List<DocumentGroup> documentGroups) {
    public record DocumentGroup(String documentType, List<PartnerDocumentMetadataResponse> documents) { }
}
