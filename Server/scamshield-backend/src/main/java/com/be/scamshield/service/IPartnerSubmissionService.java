package com.be.scamshield.service;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionCountsResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionFilterRequest;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.ReviewPartnerSubmissionRequest;
import com.be.scamshield.dto.partner.SubmitPartnerAlertRequest;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

public interface IPartnerSubmissionService {

    PartnerSubmissionResponse submitAlertOrIntel(SubmitPartnerAlertRequest request, MultipartFile file, UserPrincipal currentUser);

    PaginatedResponse<PartnerSubmissionResponse> getMySubmissions(String status, int page, int size, UserPrincipal currentUser);

    PartnerSubmissionResponse getMySubmissionDetail(Long id, UserPrincipal currentUser);

    PaginatedResponse<PartnerSubmissionResponse> getModeratorQueue(PartnerSubmissionFilterRequest filter, Pageable pageable);

    PartnerSubmissionCountsResponse getQueueCounts();

    PartnerSubmissionResponse getSubmissionDetailForModerator(Long id);

    PartnerSubmissionResponse reviewSubmission(Long id, ReviewPartnerSubmissionRequest request, UserPrincipal currentUser);

    PartnerDocument getSubmissionEvidence(Long id, UserPrincipal currentUser);

    PartnerDocument getSubmissionEvidenceForModerator(Long id);
}
