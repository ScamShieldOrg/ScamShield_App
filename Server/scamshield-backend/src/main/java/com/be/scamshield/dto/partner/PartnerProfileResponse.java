package com.be.scamshield.dto.partner;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.fasterxml.jackson.annotation.JsonInclude;

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
        LocalDateTime updatedAt,
        @JsonInclude(JsonInclude.Include.NON_NULL) String accessToken
) {
    @Override
    public String toString() {
        return "PartnerProfileResponse";
    }
}
