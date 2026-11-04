package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.constant.AbuseFlagType;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.CreateAbuseEscalationRequest;
import com.be.scamshield.dto.request.ModeratorAbuseEscalationFilterRequest;
import com.be.scamshield.dto.response.ModeratorAbuseEscalationResponse;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.AbuseFlagRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class ModeratorAbuseEscalationServiceImplTest {

    @Mock private AbuseFlagRepository abuseFlagRepository;
    @Mock private UserRepository userRepository;
    @Mock private ReportRepository reportRepository;
    @Mock private AuditLogRepository auditLogRepository;
    @Mock private Clock applicationClock;
    @InjectMocks private ModeratorAbuseEscalationServiceImpl service;

    @Test
    void createsPendingFlagWithModeratorReportsAndAuditWithoutChangingAccount() {
        User moderator = mockModerator();
        User target = User.builder().id(842L).status("ACTIVE").build();
        when(userRepository.findByIdForUpdate(842L)).thenReturn(Optional.of(target));
        when(reportRepository.findByReporterUserIdAndIdIn(842L, List.of(10L, 11L)))
                .thenReturn(List.of(Report.builder().id(11L).build(), Report.builder().id(10L).build()));
        when(applicationClock.instant()).thenReturn(Instant.parse("2026-10-28T02:00:00Z"));
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(abuseFlagRepository.save(any())).thenAnswer(invocation -> {
            AbuseFlag flag = invocation.getArgument(0);
            flag.setId(41L);
            return flag;
        });
        CreateAbuseEscalationRequest request = createRequest();
        request.setReason("  Tài khoản gửi nhiều báo cáo thiếu căn cứ  ");
        request.setEvidence("   ");

        var result = service.createEscalation(842L, request, principal());
        assertThat(result.getStatus()).isEqualTo(AbuseFlagStatus.PENDING);
        assertThat(result.getCreatedByUserId()).isEqualTo(moderator.getId());
        assertThat(result.getCreatedByName()).isEqualTo(moderator.getFullName());
        assertThat(result.getReportIds()).containsExactly(10L, 11L);
        assertThat(result.getReportId()).isEqualTo(10L);
        assertThat(result.getSeverity()).isEqualTo("MEDIUM");
        assertThat(result.getEvidence()).isNull();
        assertThat(result.getReason()).isEqualTo(request.getReason().strip());
        assertThat(target.getStatus()).isEqualTo("ACTIVE");
        verify(userRepository, never()).save(any());

        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(audit.capture());
        assertThat(audit.getValue().getEntityId()).isEqualTo(41L);
        assertThat(audit.getValue().getEntityType()).isEqualTo("ABUSE_FLAG");
        assertThat(audit.getValue().getAction()).isEqualTo("CREATE_ABUSE_ESCALATION");
        assertThat(audit.getValue().getActorUser()).isSameAs(moderator);
        assertThat(audit.getValue().getReason()).isEqualTo(result.getReason());
    }

    @Test
    void rejectsDuplicatePendingCaseBeforeSaving() {
        mockModerator();
        when(userRepository.findByIdForUpdate(842L)).thenReturn(Optional.of(User.builder().id(842L).build()));
        when(abuseFlagRepository.existsByUserIdAndStatus(842L, "PENDING")).thenReturn(true);
        assertThatThrownBy(() -> service.createEscalation(842L, createRequest(), principal()))
                .isInstanceOf(AbuseEscalationConflictException.class);
        verify(abuseFlagRepository, never()).save(any());
        verifyNoInteractions(reportRepository, auditLogRepository);
    }

    @Test
    void rejectsMissingOrForeignReports() {
        mockModerator();
        when(userRepository.findByIdForUpdate(842L)).thenReturn(Optional.of(User.builder().id(842L).build()));
        when(reportRepository.findByReporterUserIdAndIdIn(842L, List.of(10L, 11L)))
                .thenReturn(List.of(Report.builder().id(10L).build()));
        assertThatThrownBy(() -> service.createEscalation(842L, createRequest(), principal()))
                .isInstanceOf(BadRequestException.class);
        verify(abuseFlagRepository, never()).save(any());
        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void rejectsDuplicateReportIdsAndPaddedShortReason() {
        mockModerator();
        CreateAbuseEscalationRequest request = createRequest();
        request.setReportIds(List.of(10L, 10L));
        assertThatThrownBy(() -> service.createEscalation(842L, request, principal()))
                .isInstanceOf(BadRequestException.class);
        request.setReportIds(List.of(10L));
        request.setReason("             short             ");
        assertThatThrownBy(() -> service.createEscalation(842L, request, principal()))
                .isInstanceOf(BadRequestException.class);
        verifyNoInteractions(abuseFlagRepository, reportRepository, auditLogRepository);
    }

    @Test
    void createRejectsMissingTargetAccount() {
        mockModerator();
        assertThatThrownBy(() -> service.createEscalation(842L, createRequest(), principal()))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(abuseFlagRepository, reportRepository, auditLogRepository);
    }

    @Test
    void createRequiresActiveModeratorFromDatabase() {
        assertThatThrownBy(() -> service.createEscalation(842L, createRequest(), null))
                .isInstanceOf(UnauthorizedException.class);
        User moderator = mockModerator();
        moderator.setStatus("SUSPENDED");
        assertThatThrownBy(() -> service.createEscalation(842L, createRequest(), principal()))
                .isInstanceOf(ResponseStatusException.class);
        moderator.setStatus("ACTIVE");
        moderator.setRole(Role.builder().name("REGISTERED_USER").build());
        assertThatThrownBy(() -> service.createEscalation(842L, createRequest(), principal()))
                .isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(abuseFlagRepository, reportRepository, auditLogRepository);
    }

    private User mockModerator() {
        User moderator = User.builder().id(99L).fullName("Kiểm duyệt viên")
                .status("ACTIVE").role(Role.builder().name("MODERATOR").build()).build();
        when(userRepository.findById(99L)).thenReturn(Optional.of(moderator));
        return moderator;
    }

    private UserPrincipal principal() {
        return UserPrincipal.builder().id(99L).build();
    }

    private CreateAbuseEscalationRequest createRequest() {
        return CreateAbuseEscalationRequest.builder().flagType(AbuseFlagType.BULK_REPORTING)
                .reason("Tài khoản gửi nhiều báo cáo thiếu căn cứ").reportIds(List.of(10L, 11L)).build();
    }

    @Test
    void mapsExistingFlagAndUsesBoundedStablePagination() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 10, 28, 9, 0);
        AbuseFlag flag = AbuseFlag.builder().id(41L).flagType("BULK_REPORTING")
                .severity("HIGH").reason("Gửi nhiều báo cáo thiếu căn cứ").evidence("Báo cáo liên quan")
                .status("OPEN").createdAt(createdAt).report(Report.builder().id(10281L).build()).build();
        when(userRepository.existsById(842L)).thenReturn(true);
        when(abuseFlagRepository.findByUserIdAndStatusIn(eq(842L), anyCollection(), any(Pageable.class)))
                .thenAnswer(invocation -> new PageImpl<>(List.of(flag), invocation.getArgument(2), 3));

        ModeratorAbuseEscalationFilterRequest filter = new ModeratorAbuseEscalationFilterRequest();
        filter.setSize(1);
        PaginatedResponse<ModeratorAbuseEscalationResponse> result = service.getEscalations(842L, filter);

        assertThat(result.getTotalItems()).isEqualTo(3);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.isHasNext()).isTrue();
        assertThat(result.isHasPrevious()).isFalse();
        assertThat(result.getData()).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(41L);
            assertThat(item.getEscalationCode()).isEqualTo("ESC-0041");
            assertThat(item.getUserId()).isEqualTo(842L);
            assertThat(item.getReportId()).isEqualTo(10281L);
            assertThat(item.getFlagType()).isEqualTo("BULK_REPORTING");
            assertThat(item.getSeverity()).isEqualTo("HIGH");
            assertThat(item.getReason()).isEqualTo(flag.getReason());
            assertThat(item.getEvidence()).isEqualTo(flag.getEvidence());
            assertThat(item.getStatus()).isEqualTo(AbuseFlagStatus.OPEN);
            assertThat(item.getCreatedAt()).isEqualTo(createdAt);
        });

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(abuseFlagRepository).findByUserIdAndStatusIn(eq(842L),
                eq(List.of("PENDING", "DISMISSED", "OPEN")), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(1);
        assertThat(pageable.getValue().getSort()).isEqualTo(Sort.by(Sort.Direction.DESC, "createdAt", "id"));
    }

    @Test
    void filtersByStatusAndAllowsLegacyFlagsWithoutReportOrNotes() {
        ModeratorAbuseEscalationFilterRequest filter = new ModeratorAbuseEscalationFilterRequest();
        filter.setStatus("PENDING");
        AbuseFlag flag = AbuseFlag.builder().id(1L).status("PENDING").build();
        when(userRepository.existsById(842L)).thenReturn(true);
        when(abuseFlagRepository.findByUserIdAndStatusIn(eq(842L), eq(List.of("PENDING")), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(flag)));

        assertThat(service.getEscalations(842L, filter).getData()).singleElement().satisfies(item -> {
            assertThat(item.getReportId()).isNull();
            assertThat(item.getReason()).isNull();
            assertThat(item.getEvidence()).isNull();
            assertThat(item.getStatus()).isEqualTo(AbuseFlagStatus.PENDING);
        });
    }

    @Test
    void existingAccountWithoutFlagsReturnsEmptyPage() {
        when(userRepository.existsById(842L)).thenReturn(true);
        when(abuseFlagRepository.findByUserIdAndStatusIn(eq(842L), anyCollection(), any(Pageable.class)))
                .thenAnswer(invocation -> Page.empty(invocation.getArgument(2)));

        var result = service.getEscalations(842L, new ModeratorAbuseEscalationFilterRequest());
        assertThat(result.getData()).isEmpty();
        assertThat(result.getTotalItems()).isZero();
        assertThat(result.getPageSize()).isEqualTo(20);
    }

    @Test
    void missingAccountIsNotMistakenForEmptyHistory() {
        assertThatThrownBy(() -> service.getEscalations(842L, new ModeratorAbuseEscalationFilterRequest()))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(abuseFlagRepository);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void rejectsNonPositiveOrMissingUserId(Long userId) {
        assertThatThrownBy(() -> service.getEscalations(userId, new ModeratorAbuseEscalationFilterRequest()))
                .isInstanceOf(BadRequestException.class);
        verifyNoInteractions(userRepository, abuseFlagRepository);
    }
}
