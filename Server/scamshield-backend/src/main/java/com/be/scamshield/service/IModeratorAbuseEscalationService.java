package com.be.scamshield.service;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.CreateAbuseEscalationRequest;
import com.be.scamshield.dto.request.ModeratorAbuseEscalationFilterRequest;
import com.be.scamshield.dto.response.ModeratorAbuseEscalationResponse;
import com.be.scamshield.security.UserPrincipal;

public interface IModeratorAbuseEscalationService {
    ModeratorAbuseEscalationResponse createEscalation(
            Long userId, CreateAbuseEscalationRequest request, UserPrincipal currentUser);

    PaginatedResponse<ModeratorAbuseEscalationResponse> getEscalations(
            Long userId, ModeratorAbuseEscalationFilterRequest filter);
}
