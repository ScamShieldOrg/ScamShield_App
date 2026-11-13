package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.User;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReportAssignmentServiceTest {
    private final ReportRepository reports = mock(ReportRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final IndicatorRepository indicators = mock(IndicatorRepository.class);
    private final ReportAssignmentService service = new ReportAssignmentService(reports, users, indicators);

    @Test
    void onlyAssignedModeratorCanDecideWithoutAnySessionToken() {
        Report report = Report.builder().assignedModerator(User.builder().id(12L).build()).build();
        service.requireAssigned(report, UserPrincipal.builder().id(12L).build());
        assertThatThrownBy(() -> service.requireAssigned(report, UserPrincipal.builder().id(13L).build()))
                .isInstanceOf(ResponseStatusException.class).hasMessageContaining("403");
        assertThatThrownBy(() -> service.requireAssigned(report, null)).hasMessageContaining("403");
        report.setAssignedModerator(null);
        assertThatThrownBy(() -> service.requireAssigned(report, UserPrincipal.builder().id(12L).build()))
                .hasMessageContaining("403");
    }

    @Test
    void allocationBalancesPendingWorkAndPreservesExistingAssignment() {
        User owner = User.builder().id(12L).build();
        User idle = User.builder().id(13L).build();
        Report existing = Report.builder().id(41L).assignedModerator(owner).build();
        Report first = Report.builder().id(42L).build();
        Report second = Report.builder().id(43L).build();
        Report third = Report.builder().id(44L).build();
        when(users.findActiveModerators()).thenReturn(List.of(owner, idle));
        when(reports.findPendingReportsForAssignment()).thenReturn(List.of(existing, first, second, third));
        service.assignPendingReports();
        verify(indicators).lockIdentifier("report-review-allocation");
        assertThat(first.getAssignedModerator()).isSameAs(idle);
        assertThat(existing.getAssignedModerator()).isSameAs(owner);
        assertThat(List.of(existing, first, second, third).stream().filter(r -> r.getAssignedModerator() == owner).count()).isEqualTo(2);
        verify(reports, times(3)).save(any(Report.class));
    }

    @Test
    void inactiveModeratorIsReassignedAndNoActiveModeratorsLeaveReportsWaiting() {
        User active = User.builder().id(12L).build();
        Report report = Report.builder().assignedModerator(User.builder().id(13L).build()).build();
        when(users.findActiveModerators()).thenReturn(List.of(active));
        when(reports.findPendingReportsForAssignment()).thenReturn(List.of(report));
        service.assignPendingReports();
        assertThat(report.getAssignedModerator()).isSameAs(active);
        when(users.findActiveModerators()).thenReturn(List.of());
        service.assignPendingReports();
        verify(reports, times(1)).save(any(Report.class));
    }
}
