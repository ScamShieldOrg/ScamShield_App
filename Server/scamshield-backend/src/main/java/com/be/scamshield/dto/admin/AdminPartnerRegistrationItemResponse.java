package com.be.scamshield.dto.admin;

import com.be.scamshield.constant.PartnerVerificationStatus;
import java.time.LocalDateTime;

public record AdminPartnerRegistrationItemResponse(Long id, String legalName, String taxCode,
        String corporateEmail, String representativeNameAndTitle, String officialDomain,
        String officialHotline, String smsBrandName, PartnerVerificationStatus verificationStatus,
        LocalDateTime createdAt, LocalDateTime reviewedAt) { }
