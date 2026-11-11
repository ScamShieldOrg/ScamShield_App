package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.response.ModeratorDashboardResponse;
import com.be.scamshield.dto.response.ModeratorDashboardResponse.DecisionCounts;
import com.be.scamshield.repository.DisputeRepository;
import com.be.scamshield.repository.ModerationActionRepository;
import com.be.scamshield.repository.PartnerOfficialAlertRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.util.ModeratorReportScope;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ModeratorDashboardService {
    private final ModerationActionRepository reports;
    private final DisputeRepository disputes;
    private final PartnerOfficialAlertRepository submissions;

    @Transactional(readOnly = true)
    public ModeratorDashboardResponse getOverview(UserPrincipal moderator) {
        ModeratorReportScope.requireViewer(moderator);
        Long id = moderator.getId();
        return new ModeratorDashboardResponse(
                new DecisionCounts(reports.countDecidedReports(id, "APPROVE"),
                        reports.countDecidedReports(id, "REJECT")),
                new DecisionCounts(disputes.countByResolvedByUserIdAndStatus(id, DisputeStatus.APPROVED),
                        disputes.countByResolvedByUserIdAndStatus(id, DisputeStatus.REJECTED)),
                new DecisionCounts(submissions.countByReviewedByIdAndStatus(id, "VERIFIED"),
                        submissions.countByReviewedByIdAndStatus(id, "REJECTED")));
    }
}
