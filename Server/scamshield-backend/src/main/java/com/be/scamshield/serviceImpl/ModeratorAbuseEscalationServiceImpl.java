package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.CreateAbuseEscalationRequest;
import com.be.scamshield.dto.request.ModeratorAbuseEscalationFilterRequest;
import com.be.scamshield.dto.response.ModeratorAbuseEscalationResponse;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.AbuseFlagRepository;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorAbuseEscalationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class ModeratorAbuseEscalationServiceImpl implements IModeratorAbuseEscalationService {

    private static final List<String> SUPPORTED_STATUSES = Arrays.stream(AbuseFlagStatus.values())
            .map(Enum::name)
            .toList();

    private final AbuseFlagRepository abuseFlagRepository;
    private final UserRepository userRepository;
    private final ReportRepository reportRepository;
    private final AuditLogRepository auditLogRepository;
    private final Clock applicationClock;

    @Override
    @Transactional
    public ModeratorAbuseEscalationResponse createEscalation(
            Long userId, CreateAbuseEscalationRequest request, UserPrincipal currentUser) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("ID tài khoản phải là số nguyên dương");
        }
        if (currentUser == null || currentUser.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để chuyển hồ sơ");
        }
        User moderator = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy tài khoản đăng nhập"));
        if (moderator.getRole() == null || !"MODERATOR".equals(moderator.getRole().getName())
                || !"ACTIVE".equals(moderator.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ kiểm duyệt viên đang hoạt động được chuyển hồ sơ");
        }
        String reason = request.getReason().strip();
        if (reason.length() < 20) {
            throw new BadRequestException("Lý do phải có ít nhất 20 ký tự sau khi bỏ khoảng trắng đầu và cuối");
        }
        if (new HashSet<>(request.getReportIds()).size() != request.getReportIds().size()) {
            throw new BadRequestException("Danh sách ID báo cáo không được trùng lặp");
        }

        // Serialize submissions for this account, including requests from different moderators.
        User target = userRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản với ID: " + userId));
        if (abuseFlagRepository.existsByUserIdAndStatus(userId, AbuseFlagStatus.PENDING.name())) {
            throw new AbuseEscalationConflictException("Tài khoản đã có hồ sơ đang chờ quản trị viên xét duyệt");
        }
        List<Report> reports = reportRepository.findByReporterUserIdAndIdIn(userId, request.getReportIds());
        if (reports.size() != request.getReportIds().size()) {
            throw new BadRequestException("Một hoặc nhiều báo cáo không tồn tại hoặc không thuộc tài khoản bị xem xét");
        }
        List<Report> orderedReports = new ArrayList<>(reports);
        orderedReports.sort(Comparator.comparing(Report::getId));
        LocalDateTime now = LocalDateTime.now(applicationClock);
        String evidence = request.getEvidence() == null ? null : request.getEvidence().strip();
        AbuseFlag flag = abuseFlagRepository.save(AbuseFlag.builder()
                .user(target).createdBy(moderator)
                .report(orderedReports.getFirst()).relatedReports(orderedReports)
                .flagType(request.getFlagType().name()).severity("MEDIUM")
                .reason(reason).evidence(evidence == null || evidence.isEmpty() ? null : evidence)
                .status(AbuseFlagStatus.PENDING.name()).createdAt(now).build());

        auditLogRepository.save(AuditLog.builder()
                .actorUser(moderator).action("CREATE_ABUSE_ESCALATION")
                .entityType("ABUSE_FLAG").entityId(flag.getId())
                .newValue(AbuseFlagStatus.PENDING.name()).reason(reason).createdAt(now).build());
        return mapToResponse(flag, userId);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<ModeratorAbuseEscalationResponse> getEscalations(
            Long userId, ModeratorAbuseEscalationFilterRequest filter) {
        if (userId == null || userId <= 0) {
            throw new BadRequestException("ID tài khoản phải là số nguyên dương");
        }
        if (!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("Không tìm thấy tài khoản với ID: " + userId);
        }

        List<String> statuses = filter.getStatus() == null
                ? SUPPORTED_STATUSES : List.of(filter.getStatus());
        PageRequest pageable = PageRequest.of(filter.getPage(), filter.getSize(),
                Sort.by(Sort.Direction.DESC, "createdAt", "id"));

        return PaginatedResponse.buildPaginatedResponse(
                abuseFlagRepository.findByUserIdAndStatusIn(userId, statuses, pageable)
                        .map(flag -> mapToResponse(flag, userId)));
    }

    private ModeratorAbuseEscalationResponse mapToResponse(AbuseFlag flag, Long userId) {
        TreeSet<Long> reportIds = new TreeSet<>();
        flag.getRelatedReports().forEach(report -> reportIds.add(report.getId()));
        if (flag.getReport() != null) {
            reportIds.add(flag.getReport().getId());
        }
        return ModeratorAbuseEscalationResponse.builder()
                .id(flag.getId())
                .escalationCode(String.format(Locale.ROOT, "ESC-%04d", flag.getId()))
                .userId(userId)
                .reportId(flag.getReport() == null ? null : flag.getReport().getId())
                .reportIds(List.copyOf(reportIds))
                .createdByUserId(flag.getCreatedBy() == null ? null : flag.getCreatedBy().getId())
                .createdByName(flag.getCreatedBy() == null ? null : flag.getCreatedBy().getFullName())
                .flagType(flag.getFlagType())
                .severity(flag.getSeverity())
                .reason(flag.getReason())
                .evidence(flag.getEvidence())
                .status(AbuseFlagStatus.valueOf(flag.getStatus()))
                .createdAt(flag.getCreatedAt())
                .build();
    }
}
