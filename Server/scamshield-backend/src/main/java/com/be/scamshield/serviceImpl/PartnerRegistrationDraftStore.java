package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.PartnerDocumentUploadRequest;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PartnerRegistrationDraftStore {
    LocalDateTime save(String token, RegisterPartnerRequest request, String verificationToken,
                       List<PartnerDocumentUploadRequest> documents,
                       PartnerBusinessVerificationResponse businessVerification,
                       List<PartnerRegistrationPrecheckResponse.Upload> uploads);

    Optional<Draft> find(String token);
    LocalDateTime refresh(String token);
    void replaceUpload(String token, int index, PartnerRegistrationPrecheckResponse.Upload upload);
    String claim(String token);
    void releaseClaim(String token, String claimId);
    void delete(String token);

    record Draft(RegisterPartnerRequest registration, String verificationToken,
                 List<PartnerDocumentUploadRequest> documents,
                 PartnerBusinessVerificationResponse businessVerification,
                 List<PartnerRegistrationPrecheckResponse.Upload> uploads,
                 LocalDateTime expiresAt) { }
}
