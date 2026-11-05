package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.User;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class ReportAssignmentService {
    private final ReportRepository reports;
    private final UserRepository users;
    private final IndicatorRepository indicators;

    @Transactional
    public void assignPendingReports() {
        indicators.lockIdentifier("report-review-allocation");
        List<User> moderators = users.findActiveModerators();
        if (moderators.isEmpty()) return;
        Map<Long, Long> workloads = new HashMap<>();
        moderators.forEach(user -> workloads.put(user.getId(), 0L));
        List<Report> pending = reports.findPendingReportsForAssignment();
        List<Report> waiting = new ArrayList<>();
        for (Report report : pending) {
            User assigned = report.getAssignedModerator();
            if (assigned == null || !workloads.containsKey(assigned.getId())) waiting.add(report);
            else workloads.merge(assigned.getId(), 1L, Long::sum);
        }
        for (Report report : waiting) {
            long minimum = Collections.min(workloads.values());
            List<User> available = moderators.stream().filter(u -> workloads.get(u.getId()) == minimum).toList();
            User moderator = available.get(ThreadLocalRandom.current().nextInt(available.size()));
            report.setAssignedModerator(moderator);
            reports.save(report);
            workloads.merge(moderator.getId(), 1L, Long::sum);
        }
    }

    public void requireAssigned(Report report, UserPrincipal principal) {
        if (principal == null || principal.getId() == null || report.getAssignedModerator() == null
                || !Objects.equals(report.getAssignedModerator().getId(), principal.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Chỉ kiểm duyệt viên được phân công mới được duyệt báo cáo này");
        }
    }
}
