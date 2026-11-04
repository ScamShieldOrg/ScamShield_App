package com.be.scamshield.dto;

import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;

public record BusinessRegistryLookup(SourceStatus status, String taxCode, String legalName,
                                     String businessStatus, String updatedAt) {
    public static BusinessRegistryLookup unavailable(SourceStatus status) {
        return new BusinessRegistryLookup(status, null, null, null, null);
    }
}
