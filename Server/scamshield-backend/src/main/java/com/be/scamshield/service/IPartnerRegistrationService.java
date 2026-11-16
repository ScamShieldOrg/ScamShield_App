package com.be.scamshield.service;

import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.dto.request.PartnerRegistrationPrecheckRequest;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IPartnerRegistrationService {
    com.be.scamshield.dto.response.PartnerRegistrationStatusResponse status(String draftToken);
    com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse.Upload renewUpload(String draftToken, int documentIndex);
    java.time.LocalDateTime refreshDraft(String draftToken);
    PartnerRegistrationPrecheckResponse precheck(PartnerRegistrationPrecheckRequest request);

    PartnerRegistrationResponse finalizeRegistration(String draftToken);

    PartnerRegistrationResponse register(RegisterPartnerRequest request,
                                         List<MultipartFile> businessLicenseFiles,
                                         List<MultipartFile> ownershipProofFiles,
                                         List<MultipartFile> authorizationFiles);
}
