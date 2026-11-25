package com.be.scamshield.service;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.dto.response.ModeratorQueueCountsResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IModeratorReportService {

    PaginatedResponse<ModeratorReportResponse> getReportQueue(
            ModeratorReportFilterRequest filter,
            Pageable pageable,
            UserPrincipal currentUser
    );

    ModeratorQueueCountsResponse getQueueCounts(UserPrincipal currentUser);

    ModeratorReportResponse getReportById(Long id, UserPrincipal currentUser);

    ModeratorReportResponse startReview(Long id, UserPrincipal currentUser);

    String getEvidenceImageSource(Long reportId, Long evidenceId, UserPrincipal currentUser);

    ModeratorReportResponse makeDecision(Long reportId, UserPrincipal currentUser, ModeratorDecisionRequest request,
                                         Long publicEvidenceId, MultipartFile publicImage);

    ModeratorReportResponse makeDecision(Long reportId, UserPrincipal currentUser, ModeratorDecisionRequest request,
                                         List<Long> publicEvidenceIds, List<MultipartFile> publicImages);

    ModeratorReportResponse makeDecision(
            Long reportId,
            UserPrincipal currentUser,
            ModeratorDecisionRequest request
    );
}
