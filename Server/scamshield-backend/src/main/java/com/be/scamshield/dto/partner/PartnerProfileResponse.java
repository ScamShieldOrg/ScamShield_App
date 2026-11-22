package com.be.scamshield.dto.partner;

import com.be.scamshield.constant.PartnerVerificationStatus;

import java.time.LocalDateTime;

public record PartnerProfileResponse(
        String legalName,
        String brandName,
        String taxCode,
        String corporateEmail,
        String contactPhone,
        String representativeNameAndTitle,
        Boolean legalRepresentative,
        String officialDomain,
        String officialHotline,
        String smsBrandName,
        PartnerVerificationStatus verificationStatus,
        LocalDateTime verifiedAt,
        LocalDateTime updatedAt
) {}
