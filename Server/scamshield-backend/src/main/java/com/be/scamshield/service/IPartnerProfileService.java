package com.be.scamshield.service;

import com.be.scamshield.dto.partner.PartnerProfileResponse;
import com.be.scamshield.dto.partner.UpdatePartnerProfileRequest;
import com.be.scamshield.security.UserPrincipal;

public interface IPartnerProfileService {
    PartnerProfileResponse getOwnProfile(UserPrincipal principal);

    PartnerProfileResponse updateOwnProfile(UserPrincipal principal, UpdatePartnerProfileRequest request);
}
