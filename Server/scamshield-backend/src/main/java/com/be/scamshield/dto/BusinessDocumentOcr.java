package com.be.scamshield.dto;

import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ExtractedBusiness;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import java.util.List;

public record BusinessDocumentOcr(SourceStatus status, List<ExtractedBusiness> businesses) {
    public static BusinessDocumentOcr unavailable(SourceStatus status) {
        return new BusinessDocumentOcr(status, List.of());
    }
}
