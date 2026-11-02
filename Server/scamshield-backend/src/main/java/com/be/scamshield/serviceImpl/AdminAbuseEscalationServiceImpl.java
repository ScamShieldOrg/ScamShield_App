package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.AbuseFlagStatus;
import com.be.scamshield.constant.AbuseEscalationDecision;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.exception.AbuseEscalationConflictException;
import com.be.scamshield.exception.UnauthorizedException;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import com.be.scamshield.constant.EvidenceVerificationStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse.AccountDetails;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse.AuditEntry;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse.Evidence;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse.LatestModeration;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse.RelatedReport;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse.ReportActivity;
import com.be.scamshield.dto.admin.AdminAbuseEscalationFilterRequest;
import com.be.scamshield.dto.admin.AdminAbuseEscalationResponse;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.ModerationAction;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.AbuseFlagRepository;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ModerationActionRepository;
import com.be.scamshield.repository.ReportEvidenceRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.service.IAdminAbuseEscalationService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Objects;
import java.util.Arrays;
import java.util.ArrayList;
import java.util.Map;
import java.util.List;
import java.util.Locale;
import java.util.TreeSet;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminAbuseEscalationServiceImpl implements IAdminAbuseEscalationService {

    private static final List<String> SUPPORTED_STATUSES = Arrays.stream(AbuseFlagStatus.values())
            .map(Enum::name).toList();
    private static final Pattern CODE_PATTERN = Pattern.compile("^(esc|u)-(\\d+)$");

    private final AbuseFlagRepository abuseFlagRepository;
    private final UserRepository userRepository;
    private final Clock applicationClock;
    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository reportEvidenceRepository;
    private final ModerationActionRepository moderationActionRepository;
    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public AdminAbuseEscalationResponse decideEscalation(
            Long id, DecideAbuseEscalationRequest request, UserPrincipal currentUser) {
        if (id == null || id <= 0) {
            throw new BadRequestException("ID hồ sơ phải là số nguyên dương");
        }
        if (currentUser == null || currentUser.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để xử lý hồ sơ");
        }
        User admin = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy tài khoản đăng nhập"));
        if (admin.getRole() == null || !"ADMINISTRATOR".equals(admin.getRole().getName())
                || !"ACTIVE".equals(admin.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Chỉ quản trị viên đang hoạt động được xử lý hồ sơ");
        }
        if (request == null || request.getDecision() == null || request.getReason() == null) {
            throw new BadRequestException("Quyết định và lý do không được để trống");
        }
        String reason = request.getReason().strip();
        if (reason.length() < 20 || reason.length() > 2000) {
            throw new BadRequestException("Lý do quyết định phải từ 20 đến 2000 ký tự sau khi bỏ khoảng trắng đầu và cuối");
        }
        Long targetId = abuseFlagRepository.findTargetUserId(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ lạm dụng với ID: " + id));
        // Match the moderator submission lock order: account first, then case.
        User target = userRepository.findByIdForUpdate(targetId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản của hồ sơ"));
        AbuseFlag flag = abuseFlagRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ lạm dụng với ID: " + id));
        if (flag.getUser() == null || !targetId.equals(flag.getUser().getId())) {
            throw new AbuseEscalationConflictException("Tài khoản của hồ sơ đã thay đổi, vui lòng tải lại");
        }
        if (!SUPPORTED_STATUSES.contains(flag.getStatus())) {
            throw new ResourceNotFoundException("Không tìm thấy hồ sơ lạm dụng với ID: " + id);
        }
        if (!AbuseFlagStatus.PENDING.name().equals(flag.getStatus())) {
            throw new AbuseEscalationConflictException("Hồ sơ đã có quyết định xử lý");
        }
        AbuseEscalationDecision decision = request.getDecision();
        String oldUserStatus = target.getStatus();
        String newUserStatus = switch (decision) {
            case SUSPEND -> "SUSPENDED";
            case BAN -> "BANNED";
            default -> oldUserStatus;
        };
        if ((decision == AbuseEscalationDecision.SUSPEND || decision == AbuseEscalationDecision.BAN)
                && targetId.equals(admin.getId())) {
            throw new BadRequestException("Bạn không thể tự khóa hoặc cấm tài khoản của chính mình");
        }
        if (decision == AbuseEscalationDecision.SUSPEND && "BANNED".equals(oldUserStatus)) {
            throw new AbuseEscalationConflictException("Không thể chuyển tài khoản đã bị cấm sang tạm khóa");
        }
        LocalDateTime now = LocalDateTime.now(applicationClock);
        String newFlagStatus = decision == AbuseEscalationDecision.DISMISS
                ? AbuseFlagStatus.DISMISSED.name() : AbuseFlagStatus.OPEN.name();
        flag.setStatus(newFlagStatus);
        // OPEN remains an active flag; review time and action are recorded in audit.
        flag.setResolvedAt(decision == AbuseEscalationDecision.DISMISS ? now : null);
        abuseFlagRepository.save(flag);
        auditLogRepository.save(AuditLog.builder().actorUser(admin)
                .action("DECIDE_ABUSE_ESCALATION_" + decision.name()).entityType("ABUSE_FLAG").entityId(id)
                .previousValue(AbuseFlagStatus.PENDING.name()).newValue(newFlagStatus)
                .reason(reason).createdAt(now).build());
        if (!Objects.equals(oldUserStatus, newUserStatus)) {
            target.setStatus(newUserStatus);
            target.setUpdatedAt(now);
            userRepository.save(target);
            auditLogRepository.save(AuditLog.builder().actorUser(admin).action("UPDATE_STATUS")
                    .entityType("USER").entityId(targetId).previousValue(oldUserStatus).newValue(newUserStatus)
                    .reason("Hồ sơ ESC-" + id + ": " + reason).createdAt(now).build());
        }
        return mapToResponse(flag);
    }

    @Override
    @Transactional(readOnly = true)
    public AdminAbuseEscalationDetailResponse getEscalationById(Long id) {
        if (id == null || id <= 0) {
            throw new BadRequestException("ID hồ sơ phải là số nguyên dương");
        }
        AbuseFlag flag = abuseFlagRepository.findByIdAndUserIsNotNullAndStatusIn(id, SUPPORTED_STATUSES)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ lạm dụng với ID: " + id));
        User user = flag.getUser();
        Map<Long, Report> reports = new TreeMap<>();
        List<Report> candidates = new ArrayList<>(flag.getRelatedReports());
        if (flag.getReport() != null) {
            candidates.add(flag.getReport());
        }
        // Do not attribute another account's reports to this user if legacy links are inconsistent.
        candidates.stream().filter(report -> report.getReporterUser() != null
                        && user.getId().equals(report.getReporterUser().getId()))
                .forEach(report -> reports.put(report.getId(), report));
        List<Long> reportIds = List.copyOf(reports.keySet());
        Map<Long, List<ReportEvidence>> evidenceByReport = reportIds.isEmpty() ? Map.of()
                : reportEvidenceRepository.findByReportIdInOrderByCreatedAtAscIdAsc(reportIds).stream()
                        .collect(Collectors.groupingBy(evidence -> evidence.getReport().getId()));
        Map<Long, ModerationAction> latestActions = reportIds.isEmpty() ? Map.of()
                : moderationActionRepository.findByReportIdInOrderByCreatedAtDescIdDesc(reportIds).stream()
                        .collect(Collectors.toMap(action -> action.getReport().getId(), Function.identity(), (latest, older) -> latest));
        List<RelatedReport> relatedReports = reports.values().stream()
                .map(report -> mapRelatedReport(report, latestActions.get(report.getId()),
                        evidenceByReport.getOrDefault(report.getId(), List.of())))
                .toList();
        AdminAbuseEscalationResponse summary = mapToResponse(flag);
        summary.setReportIds(reportIds);

        return AdminAbuseEscalationDetailResponse.builder()
                .escalation(summary)
                .accountDetails(AccountDetails.builder().phoneNumber(user.getPhoneNumber())
                        .phoneVerified(user.getIsPhoneVerified()).reputationPoints(user.getReputationPoints())
                        .joinedAt(user.getCreatedAt()).build())
                .activity(getReportActivity(user.getId(), flag.getCreatedAt()))
                .reports(relatedReports)
                .auditTrail(auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDescIdDesc("ABUSE_FLAG", id)
                        .stream().map(this::mapAuditEntry).toList())
                .build();
    }

    private ReportActivity getReportActivity(Long userId, LocalDateTime windowEnd) {
        LocalDateTime windowStart = windowEnd.minusHours(24);
        ReportRepository.AbuseReportActivity totals = reportRepository.getAbuseReportActivity(userId, windowStart, windowEnd);
        BigDecimal rejectedPercentage = totals.getTotalReports() == 0 ? null
                : BigDecimal.valueOf(totals.getRejectedReports()).multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(totals.getTotalReports()), 2, RoundingMode.HALF_UP);
        return ReportActivity.builder().windowStart(windowStart).windowEnd(windowEnd)
                .totalReports(totals.getTotalReports()).rejectedReports(totals.getRejectedReports())
                .distinctIndicators(totals.getDistinctIndicators()).rejectedPercentage(rejectedPercentage).build();
    }

    private RelatedReport mapRelatedReport(Report report, ModerationAction action, List<ReportEvidence> evidences) {
        return RelatedReport.builder().id(report.getId()).reportCode("RPT-" + report.getId())
                .indicatorId(report.getIndicator() == null ? null : report.getIndicator().getId())
                .targetType(report.getIndicator() == null ? null : report.getIndicator().getType())
                .targetValue(report.getIndicator() == null ? null
                        : report.getIndicator().getDisplayValue() == null ? report.getIndicator().getNormalizedValue()
                        : report.getIndicator().getDisplayValue())
                .categoryId(report.getCategory() == null ? null : report.getCategory().getId())
                .categoryName(report.getCategory() == null ? null : report.getCategory().getName())
                .status(report.getStatus()).description(report.getDescription()).reportedMessage(report.getReportedMessage())
                .createdAt(report.getCreatedAt()).updatedAt(report.getUpdatedAt())
                .latestModeration(action == null ? null : LatestModeration.builder()
                        .id(action.getId()).action(action.getAction()).reason(action.getReason())
                        .moderatorUserId(action.getModeratorUser() == null ? null : action.getModeratorUser().getId())
                        .moderatorName(action.getModeratorUser() == null ? null : action.getModeratorUser().getFullName())
                        .createdAt(action.getCreatedAt()).build())
                .evidences(evidences.stream().map(evidence -> Evidence.builder()
                        .id(evidence.getId()).evidenceType(evidence.getEvidenceType()).fileName(evidence.getFileName())
                        .fileUrl(evidence.getFileUrl()).sourceUrl(evidence.getSourceUrl())
                        .extractedText(evidence.getExtractedText()).ocrText(evidence.getOcrText())
                        .verificationStatus(EvidenceVerificationStatus.fromStoredValue(evidence.getVerificationStatus())).createdAt(evidence.getCreatedAt()).build()).toList())
                .build();
    }

    private AuditEntry mapAuditEntry(AuditLog log) {
        User actor = log.getActorUser();
        return AuditEntry.builder().id(log.getId()).actorUserId(actor == null ? null : actor.getId())
                .actorName(actor == null ? null : actor.getFullName()).action(log.getAction())
                .previousValue(log.getPreviousValue()).newValue(log.getNewValue()).reason(log.getReason())
                .createdAt(log.getCreatedAt()).build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<AdminAbuseEscalationResponse> getEscalations(AdminAbuseEscalationFilterRequest filter) {
        // Keep Pageable unsorted so Spring Data does not replace the CASE-based priority order.
        PageRequest pageable = PageRequest.of(filter.getPage(), filter.getSize());
        if (pageable.getOffset() > Integer.MAX_VALUE) {
            throw new BadRequestException("Vị trí trang vượt quá giới hạn truy vấn, vui lòng chọn trang nhỏ hơn");
        }
        return PaginatedResponse.buildPaginatedResponse(
                abuseFlagRepository.findAll(createSpecification(filter), pageable).map(this::mapToResponse));
    }

    private Specification<AbuseFlag> createSpecification(AdminAbuseEscalationFilterRequest filter) {
        List<String> statuses = "ALL".equals(filter.getStatus()) ? SUPPORTED_STATUSES : List.of(filter.getStatus());
        String search = filter.getSearch() == null ? "" : filter.getSearch().strip().toLowerCase(Locale.ROOT);
        return (root, query, cb) -> {
            applySorting(root, query, cb, filter.getSort());
            // Report-only flags without a target account do not belong in this queue.
            Join<AbuseFlag, User> user = root.join("user", JoinType.INNER);
            Predicate status = root.get("status").in(statuses);
            if (search.isEmpty()) {
                return status;
            }
            Matcher code = CODE_PATTERN.matcher(search);
            if (code.matches()) {
                try {
                    long id = Long.parseLong(code.group(2));
                    return cb.and(status, "esc".equals(code.group(1))
                            ? cb.equal(root.get("id"), id) : cb.equal(user.get("id"), id));
                } catch (NumberFormatException ex) {
                    return cb.disjunction();
                }
            }
            String pattern = "%" + search.replace("!", "!!").replace("%", "!%")
                    .replace("_", "!_") + "%";
            return cb.and(status, cb.or(
                    cb.like(cb.lower(user.get("fullName")), pattern, '!'),
                    cb.like(cb.lower(user.get("email")), pattern, '!'),
                    cb.like(cb.lower(user.get("phoneNumber")), pattern, '!')));
        };
    }

    private void applySorting(Root<AbuseFlag> root, CriteriaQuery<?> query, CriteriaBuilder cb, String sort) {
        // Count queries must not inherit ORDER BY expressions used for the page content.
        if (query == null || Long.class.equals(query.getResultType()) || long.class.equals(query.getResultType())) {
            return;
        }
        String[] parts = sort.split(",");
        boolean ascending = "asc".equalsIgnoreCase(parts[1]);
        if ("priority".equalsIgnoreCase(parts[0])) {
            Expression<String> severity = cb.upper(cb.trim(root.get("severity")));
            Expression<Integer> knownPriority = cb.<Integer>selectCase()
                    .when(severity.in("HIGH", "MEDIUM", "LOW"), 0).otherwise(1);
            Expression<Integer> priority = cb.<Integer>selectCase()
                    .when(cb.equal(severity, "HIGH"), 3)
                    .when(cb.equal(severity, "MEDIUM"), 2)
                    .when(cb.equal(severity, "LOW"), 1).otherwise(0);
            query.orderBy(cb.asc(knownPriority), ascending ? cb.asc(priority) : cb.desc(priority),
                    cb.desc(root.get("createdAt")), cb.desc(root.get("id")));
        } else {
            query.orderBy(ascending ? cb.asc(root.get("createdAt")) : cb.desc(root.get("createdAt")),
                    cb.desc(root.get("id")));
        }
    }

    private AdminAbuseEscalationResponse mapToResponse(AbuseFlag flag) {
        User user = flag.getUser();
        User creator = flag.getCreatedBy();
        TreeSet<Long> reportIds = new TreeSet<>();
        for (Report report : flag.getRelatedReports()) {
            reportIds.add(report.getId());
        }
        if (flag.getReport() != null) {
            reportIds.add(flag.getReport().getId());
        }
        return AdminAbuseEscalationResponse.builder()
                .id(flag.getId()).escalationCode(String.format(Locale.ROOT, "ESC-%04d", flag.getId()))
                .userId(user.getId()).userCode(String.format(Locale.ROOT, "U-%05d", user.getId()))
                .fullName(user.getFullName()).email(user.getEmail()).userStatus(user.getStatus())
                .createdByUserId(creator == null ? null : creator.getId())
                .createdByName(creator == null ? null : creator.getFullName())
                .flagType(flag.getFlagType()).severity(flag.getSeverity())
                .reason(flag.getReason()).evidence(flag.getEvidence())
                .status(AbuseFlagStatus.valueOf(flag.getStatus())).reportIds(List.copyOf(reportIds))
                .createdAt(flag.getCreatedAt()).build();
    }
}
