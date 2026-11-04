package com.be.scamshield.service;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationCountsResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationDetailResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationItemResponse;
import com.be.scamshield.dto.admin.PartnerDocumentContentResponse;
import com.be.scamshield.dto.request.AdminPartnerReviewRequest;

public interface AdminPartnerRegistrationService {
    PaginatedResponse<AdminPartnerRegistrationItemResponse> list(String search,
            PartnerVerificationStatus status, int page, int size);

    AdminPartnerRegistrationCountsResponse counts();

    AdminPartnerRegistrationDetailResponse detail(Long id);

    PartnerDocumentContentResponse document(Long partnerId, Long documentId);

    AdminPartnerRegistrationDetailResponse review(Long id, AdminPartnerReviewRequest request, Long reviewerId);
}
