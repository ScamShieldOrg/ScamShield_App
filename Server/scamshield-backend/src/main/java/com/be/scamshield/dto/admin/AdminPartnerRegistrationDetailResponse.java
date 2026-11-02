package com.be.scamshield.dto.admin;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import java.time.LocalDateTime;
import java.util.List;

public record AdminPartnerRegistrationDetailResponse(Long id, Long userId, String legalName,
        String taxCode, String corporateEmail, String representativeNameAndTitle, String contactPhone,
        Boolean legalRepresentative, String officialDomain, String officialHotline, String smsBrandName,
        PartnerVerificationStatus verificationStatus, LocalDateTime createdAt, LocalDateTime reviewedAt,
        String reviewedBy, String reviewReason, PartnerBusinessVerificationResponse businessVerification,
        List<PartnerDocumentMetadataResponse> documents) { }
