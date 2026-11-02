package com.be.scamshield.service;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationFilterRequest;
import com.be.scamshield.dto.admin.AdminAbuseEscalationResponse;

public interface IAdminAbuseEscalationService {
    AdminAbuseEscalationResponse decideEscalation(Long id, DecideAbuseEscalationRequest request, UserPrincipal currentUser);

    AdminAbuseEscalationDetailResponse getEscalationById(Long id);

    PaginatedResponse<AdminAbuseEscalationResponse> getEscalations(AdminAbuseEscalationFilterRequest filter);
}
