package com.be.scamshield.dto.response;

import java.time.LocalDateTime;
import java.util.List;

public record PartnerRegistrationPrecheckResponse(
        String draftToken,
        LocalDateTime expiresAt,
        PartnerBusinessVerificationResponse businessVerification,
        List<Upload> uploads) {
    public record Upload(int documentIndex, String uploadUrl, String objectKey, long expiresInSeconds) { }
}
