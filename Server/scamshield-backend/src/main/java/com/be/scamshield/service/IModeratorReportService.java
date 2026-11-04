package com.be.scamshield.service;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.dto.response.ModeratorQueueCountsResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.data.domain.Pageable;

public interface IModeratorReportService {

    PaginatedResponse<ModeratorReportResponse> getReportQueue(
            ModeratorReportFilterRequest filter,
            Pageable pageable
    );

    ModeratorQueueCountsResponse getQueueCounts();

    ModeratorReportResponse getReportById(Long id);

    ModeratorReportResponse makeDecision(
            Long reportId,
            UserPrincipal currentUser,
            ModeratorDecisionRequest request
    );
}
