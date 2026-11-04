package com.be.scamshield.dto.response;

import com.be.scamshield.constant.PartnerVerificationStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
public class PartnerRegistrationResponse {
    // Kept for API compatibility: this is now the PartnerProfile ID.
    private Long registrationId;
    private Long userId;
    private PartnerVerificationStatus verificationStatus;
    private LocalDateTime submittedAt;
    private PartnerBusinessVerificationResponse businessVerification;

    public PartnerRegistrationResponse(Long registrationId, Long userId,
                                       PartnerVerificationStatus verificationStatus, LocalDateTime submittedAt) {
        this(registrationId, userId, verificationStatus, submittedAt, null);
    }
}
