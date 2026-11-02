package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.EvidenceVerificationStatus;
import com.be.scamshield.constant.ReportPriority;
import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.dto.response.ModeratorEvidenceResponse;
import com.be.scamshield.dto.response.ModeratorQueueCountsResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorReportService;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import java.math.BigDecimal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModeratorReportServiceImpl implements IModeratorReportService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM HH:mm");
    private static final Pattern CASE_CODE_PATTERN = Pattern.compile("(?i)CS-\\d{4}-(\\d+)");
    private static final Set<String> DECIDABLE_STATUSES = Set.of(
            ReportStatus.PENDING.name(),
            ReportStatus.IN_REVIEW.name()
    );

    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository reportEvidenceRepository;
    private final UserRepository userRepository;
    private final ModerationActionRepository moderationActionRepository;
    private final AuditLogRepository auditLogRepository;
    private final ConfirmedIndicatorRepository confirmedIndicatorRepository;
    private final NotificationRepository notificationRepository;
    private final ScamCategorieRepository scamCategorieRepository;
    private final ReputationTransactionRepository reputationTransactionRepository;

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<ModeratorReportResponse> getReportQueue(
            ModeratorReportFilterRequest filter,
            Pageable pageable) {

        ModeratorReportFilterRequest safeFilter = filter != null ? filter : new ModeratorReportFilterRequest();
        Specification<Report> spec = createFilterSpecification(safeFilter);
        Page<Report> pageResult = reportRepository.findAll(spec, pageable);

        if (pageResult.isEmpty()) {
            PaginatedResponse<ModeratorReportResponse> emptyResponse = new PaginatedResponse<>();
            emptyResponse.setData(Collections.emptyList());
            emptyResponse.setCurrentPage(pageResult.getNumber());
            emptyResponse.setTotalItems(pageResult.getTotalElements());
            emptyResponse.setPageSize(pageResult.getSize());
            emptyResponse.setTotalPages(pageResult.getTotalPages());
            emptyResponse.setHasNext(pageResult.hasNext());
            emptyResponse.setHasPrevious(pageResult.hasPrevious());
            return emptyResponse;
        }

        List<Long> reportIds = pageResult.getContent().stream()
                .map(Report::getId)
                .toList();

        Map<Long, List<ReportEvidence>> evidenceMap = reportEvidenceRepository.findByReportIdIn(reportIds)
                .stream()
                .collect(Collectors.groupingBy(ev -> ev.getReport().getId()));

        List<ModeratorReportResponse> responseList = pageResult.getContent().stream()
                .map(report -> mapToModeratorReportResponse(
                        report,
                        evidenceMap.getOrDefault(report.getId(), Collections.emptyList())
                ))
                .toList();

        PaginatedResponse<ModeratorReportResponse> response = new PaginatedResponse<>();
        response.setData(responseList);
        response.setCurrentPage(pageResult.getNumber());
        response.setTotalItems(pageResult.getTotalElements());
        response.setPageSize(pageResult.getSize());
        response.setTotalPages(pageResult.getTotalPages());
        response.setHasNext(pageResult.hasNext());
        response.setHasPrevious(pageResult.hasPrevious());

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public ModeratorQueueCountsResponse getQueueCounts() {
        long locked = reportRepository.countByModerationLockedTrueOrStatusIgnoreCase("LOCKED");
        long pending = reportRepository.countByStatusIgnoreCaseAndModerationLockedFalse("PENDING");
        long inReview = reportRepository.countByStatusIgnoreCaseAndModerationLockedFalse("IN_REVIEW");
        long all = reportRepository.count();

        return ModeratorQueueCountsResponse.builder()
                .all(all)
                .pending(pending)
                .inReview(inReview)
                .locked(locked)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ModeratorReportResponse getReportById(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ báo cáo với ID: " + id));

        List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(id);
        return mapToModeratorReportResponse(report, evidences);
    }

    @Override
    @Transactional
    public ModeratorReportResponse makeDecision(
            Long reportId,
            UserPrincipal currentUser,
            ModeratorDecisionRequest request) {

        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ báo cáo với ID: " + reportId));

        String previousStatus = report.getStatus();
        if (Boolean.TRUE.equals(report.getModerationLocked()) || "LOCKED".equalsIgnoreCase(previousStatus)) {
            throw new BadRequestException("Hồ sơ báo cáo đang bị khóa kiểm duyệt, không thể xử lý");
        }

        if (previousStatus == null || !DECIDABLE_STATUSES.contains(previousStatus.toUpperCase())) {
            if ("APPROVED".equalsIgnoreCase(previousStatus) || "REJECTED".equalsIgnoreCase(previousStatus)) {
                throw new BadRequestException("Hồ sơ báo cáo này đã có quyết định xử lý trước đó (" + previousStatus + ")");
            }
            throw new BadRequestException("Không thể xử lý hồ sơ ở trạng thái hiện tại (" + previousStatus + ")");
        }

        User moderatorUser = resolveModeratorUser(currentUser);
        LocalDateTime now = LocalDateTime.now();

        String newReportStatus = switch (request.getDecision()) {
            case APPROVE -> "APPROVED";
            case REJECT -> "REJECTED";
        };

        // Determine optional matched ScamCategory from categoryId
        ScamCategory matchedCategory = null;
        if (request.getCategoryId() != null) {
            matchedCategory = scamCategorieRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục lừa đảo với ID: " + request.getCategoryId()));
        }

        // Find all reports of this Indicator currently in eligible decidable statuses (PENDING, IN_REVIEW) to process in bulk
        List<Report> reportsToProcess = new ArrayList<>();
        reportsToProcess.add(report);

        if (report.getIndicator() != null) {
            for (String decidableStatus : DECIDABLE_STATUSES) {
                List<Report> siblingReports = reportRepository.findByIndicatorIdAndStatusIgnoreCase(
                        report.getIndicator().getId(), decidableStatus);
                for (Report siblingReport : siblingReports) {
                    if (!siblingReport.getId().equals(report.getId())
                            && !Boolean.TRUE.equals(siblingReport.getModerationLocked())
                            && !"LOCKED".equalsIgnoreCase(siblingReport.getStatus())) {
                        reportsToProcess.add(siblingReport);
                    }
                }
            }
        }

        // Process all affected reports
        for (Report r : reportsToProcess) {
            String prevStatus = r.getStatus();
            r.setStatus(newReportStatus);
            r.setModerationLocked(false);
            r.setLockedByUser(null);
            r.setLockedAt(null);
            r.setUpdatedAt(now);

            if (matchedCategory != null) {
                r.setCategory(matchedCategory);
            }

            reportRepository.save(r);

            // Save ModerationAction
            ModerationAction action = ModerationAction.builder()
                    .report(r)
                    .moderatorUser(moderatorUser)
                    .action(request.getDecision().name())
                    .reason(request.getReason())
                    .previousStatus(prevStatus)
                    .newStatus(newReportStatus)
                    .createdAt(now)
                    .build();
            moderationActionRepository.save(action);

            // Save AuditLog
            AuditLog auditLog = AuditLog.builder()
                    .actorUser(moderatorUser)
                    .action("MODERATION_" + request.getDecision().name())
                    .entityType("REPORT")
                    .entityId(r.getId())
                    .previousValue(prevStatus)
                    .newValue(newReportStatus)
                    .reason(request.getReason())
                    .createdAt(now)
                    .build();
            auditLogRepository.save(auditLog);

            // Reporter rewards and notifications
            if (r.getReporterUser() != null) {
                User reporter = r.getReporterUser();
                String targetVal = r.getIndicator() != null ? r.getIndicator().getDisplayValue() : ("#RPT-" + r.getId());

                if (request.getDecision() == ModeratorDecisionRequest.DecisionType.APPROVE) {
                    // Reward reputation points (+30 points)
                    int bonusPoints = 30;
                    int currentPoints = reporter.getReputationPoints() != null ? reporter.getReputationPoints() : 0;
                    reporter.setReputationPoints(currentPoints + bonusPoints);
                    userRepository.save(reporter);

                    ReputationTransaction tx = ReputationTransaction.builder()
                            .user(reporter)
                            .pointsDelta(bonusPoints)
                            .reasonCode("REPORT_APPROVED")
                            .referenceType("REPORT")
                            .referenceId(r.getId())
                            .createdAt(now)
                            .build();
                    reputationTransactionRepository.save(tx);

                    // Send approval notification
                    Notification notification = Notification.builder()
                            .user(reporter)
                            .type("REPORT_VERDICT")
                            .title("Báo cáo đã được phê duyệt")
                            .message("Báo cáo của bạn về " + targetVal + " đã được xác thực và đưa vào danh sách cảnh báo.")
                            .referenceType("REPORT")
                            .referenceId(r.getId())
                            .isRead(false)
                            .createdAt(now)
                            .build();
                    notificationRepository.save(notification);
                } else {
                    // Send rejection notification
                    Notification notification = Notification.builder()
                            .user(reporter)
                            .type("REPORT_VERDICT")
                            .title("Báo cáo đã bị từ chối")
                            .message("Báo cáo của bạn về " + targetVal + " chưa đủ căn cứ xác thực và đã bị từ chối.")
                            .referenceType("REPORT")
                            .referenceId(r.getId())
                            .isRead(false)
                            .createdAt(now)
                            .build();
                    notificationRepository.save(notification);
                }
            }
        }

        // If APPROVE: Add/Reactivate ConfirmedIndicator (Blacklist) for the indicator
        if (request.getDecision() == ModeratorDecisionRequest.DecisionType.APPROVE && report.getIndicator() != null) {
            Optional<ConfirmedIndicator> existingConfirmedOpt = confirmedIndicatorRepository.findByIndicatorId(report.getIndicator().getId());
            if (existingConfirmedOpt.isPresent()) {
                ConfirmedIndicator existing = existingConfirmedOpt.get();
                existing.setStatus("ACTIVE");
                existing.setRetractedAt(null);
                existing.setRetractionReason(null);
                existing.setConfirmedAt(now);
                existing.setConfirmedByUser(moderatorUser);
                existing.setSourceReport(report);
                existing.setCategory(report.getCategory());
                existing.setPublicReason(request.getReason());
                confirmedIndicatorRepository.save(existing);
            } else {
                ConfirmedIndicator newConfirmed = ConfirmedIndicator.builder()
                        .indicator(report.getIndicator())
                        .category(report.getCategory())
                        .status("ACTIVE")
                        .confirmedByUser(moderatorUser)
                        .sourceReport(report)
                        .confirmedAt(now)
                        .publicReason(request.getReason())
                        .build();
                confirmedIndicatorRepository.save(newConfirmed);
            }
        }

        List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(reportId);
        return mapToModeratorReportResponse(report, evidences);
    }

    private User resolveModeratorUser(UserPrincipal currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new BadRequestException("Thông tin định danh kiểm duyệt viên không hợp lệ");
        }
        return userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản kiểm duyệt viên với ID: " + currentUser.getId()));
    }

    private Specification<Report> createFilterSpecification(ModeratorReportFilterRequest filter) {
        String tab = filter.getTab();
        String search = filter.getSearch();
        ReportPriority priority = filter.getPriority();
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Tab filtering
            if (StringUtils.hasText(tab) && !"ALL".equalsIgnoreCase(tab.trim())) {
                String cleanTab = tab.trim().toUpperCase();
                switch (cleanTab) {
                    case "PENDING" -> {
                        predicates.add(cb.equal(cb.upper(root.get("status")), "PENDING"));
                        predicates.add(cb.or(
                                cb.isNull(root.get("moderationLocked")),
                                cb.isFalse(root.get("moderationLocked"))
                        ));
                    }
                    case "IN_REVIEW" -> {
                        predicates.add(cb.equal(cb.upper(root.get("status")), "IN_REVIEW"));
                        predicates.add(cb.or(
                                cb.isNull(root.get("moderationLocked")),
                                cb.isFalse(root.get("moderationLocked"))
                        ));
                    }
                    case "LOCKED" -> {
                        predicates.add(cb.or(
                                cb.isTrue(root.get("moderationLocked")),
                                cb.equal(cb.upper(root.get("status")), "LOCKED")
                        ));
                    }
                    default -> {
                        predicates.add(cb.equal(cb.upper(root.get("status")), cleanTab));
                    }
                }
            }

            // 2. Priority filtering
            if (priority != null) {
                predicates.add(buildPriorityPredicate(root, cb, priority));
            }

            // 3. Search query filtering
            if (StringUtils.hasText(search)) {
                String searchTrim = search.trim();
                String searchLike = "%" + searchTrim.toLowerCase() + "%";

                Join<Report, Indicator> indicatorJoin = root.join("indicator", JoinType.LEFT);
                Join<Report, ScamCategory> categoryJoin = root.join("category", JoinType.LEFT);
                Join<Report, User> userJoin = root.join("reporterUser", JoinType.LEFT);

                List<Predicate> searchPredicates = new ArrayList<>();

                Long searchId = parseSearchId(searchTrim);
                if (searchId != null) {
                    searchPredicates.add(cb.equal(root.get("id"), searchId));
                }

                searchPredicates.add(cb.like(cb.lower(indicatorJoin.get("normalizedValue")), searchLike));
                searchPredicates.add(cb.like(cb.lower(indicatorJoin.get("displayValue")), searchLike));
                searchPredicates.add(cb.like(cb.lower(categoryJoin.get("name")), searchLike));
                searchPredicates.add(cb.like(cb.lower(categoryJoin.get("code")), searchLike));
                searchPredicates.add(cb.like(cb.lower(userJoin.get("fullName")), searchLike));
                searchPredicates.add(cb.like(cb.lower(userJoin.get("email")), searchLike));
                searchPredicates.add(cb.like(cb.lower(userJoin.get("phoneNumber")), searchLike));
                searchPredicates.add(cb.like(cb.lower(root.get("reportedMessage")), searchLike));
                searchPredicates.add(cb.like(cb.lower(root.get("description")), searchLike));

                predicates.add(cb.or(searchPredicates.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Predicate buildPriorityPredicate(Root<Report> root, CriteriaBuilder cb, ReportPriority priority) {
        Predicate directMatch = cb.equal(root.get("priority"), priority);
        Predicate nullPriority = cb.isNull(root.get("priority"));
        Expression<BigDecimal> score = root.get("priorityScore");

        Predicate fallbackMatch = switch (priority) {
            case URGENT -> cb.and(
                    nullPriority,
                    cb.greaterThanOrEqualTo(score, Report.PRIORITY_THRESHOLD_URGENT)
            );
            case HIGH -> cb.and(
                    nullPriority,
                    cb.isNotNull(score),
                    cb.greaterThanOrEqualTo(score, Report.PRIORITY_THRESHOLD_HIGH),
                    cb.lessThan(score, Report.PRIORITY_THRESHOLD_URGENT)
            );
            case NORMAL -> cb.and(
                    nullPriority,
                    cb.or(
                            cb.isNull(score),
                            cb.lessThan(score, Report.PRIORITY_THRESHOLD_HIGH)
                    )
            );
        };

        return cb.or(directMatch, fallbackMatch);
    }

    private Long parseSearchId(String search) {
        if (search.matches("\\d+")) {
            try {
                return Long.parseLong(search);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        Matcher matcher = CASE_CODE_PATTERN.matcher(search);
        if (matcher.matches()) {
            try {
                return Long.parseLong(matcher.group(1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private ModeratorReportResponse mapToModeratorReportResponse(Report report, List<ReportEvidence> evidences) {
        int year = report.getCreatedAt() != null ? report.getCreatedAt().getYear() : 2024;
        String formattedCode = String.format("CS-%d-%04d", year, report.getId());

        String targetIdentifier = "N/A";
        String targetType = "UNKNOWN";
        if (report.getIndicator() != null) {
            targetType = report.getIndicator().getType();
            if (StringUtils.hasText(report.getIndicator().getDisplayValue())) {
                targetIdentifier = report.getIndicator().getDisplayValue();
            } else if (StringUtils.hasText(report.getIndicator().getNormalizedValue())) {
                targetIdentifier = report.getIndicator().getNormalizedValue();
            }
        } else if (StringUtils.hasText(report.getReportedMessage())) {
            targetIdentifier = report.getReportedMessage();
        }

        String categoryName = report.getCategory() != null ? report.getCategory().getName() : "Chưa phân loại";
        Long categoryId = report.getCategory() != null ? report.getCategory().getId() : null;

        String reportedBy = "Ẩn danh";
        if (report.getReporterUser() != null) {
            User user = report.getReporterUser();
            if (StringUtils.hasText(user.getEmail())) {
                reportedBy = user.getEmail().split("@")[0];
            } else if (StringUtils.hasText(user.getFullName())) {
                reportedBy = user.getFullName();
            }
        }

        String reportedAt = report.getCreatedAt() != null
                ? report.getCreatedAt().format(DATE_TIME_FORMATTER)
                : "";

        int completeness = report.getEvidenceCompleteness() != null
                ? report.getEvidenceCompleteness()
                : calculateEvidenceCompleteness(evidences);

        List<ModeratorEvidenceResponse> evidenceResponses = evidences.stream()
                .map(this::mapToModeratorEvidenceResponse)
                .toList();

        List<String> taxonomies = report.getCategory() != null
                ? List.of(report.getCategory().getName())
                : Collections.emptyList();

        String uiStatus = mapToUiStatus(report.getStatus(), report.getModerationLocked());

        return ModeratorReportResponse.builder()
                .id(formattedCode)
                .rawId(report.getId())
                .targetIdentifier(targetIdentifier)
                .targetType(targetType)
                .category(categoryName)
                .categoryId(categoryId)
                .reportCount(report.getReportCountSignal() != null ? report.getReportCountSignal() : 1)
                .reportedBy(reportedBy)
                .reportedAt(reportedAt)
                .priority(report.resolvePriority())
                .status(uiStatus)
                // Theo yêu cầu của người dùng: Hiện tại các trường phán quyết AI để trống trong DTO
                .aiScore(null)
                .aiRiskLevel(null)
                .aiConfidence(null)
                .evidenceCompleteness(completeness)
                .reporterProposal(StringUtils.hasText(report.getReporterProposal()) ? report.getReporterProposal() : report.getDescription())
                .evidences(evidenceResponses)
                .taxonomies(taxonomies)
                .isLocked(Boolean.TRUE.equals(report.getModerationLocked()))
                .build();
    }

    private ModeratorEvidenceResponse mapToModeratorEvidenceResponse(ReportEvidence ev) {
        String name = extractFileName(ev);
        String type = resolveEvidenceType(ev.getEvidenceType(), ev.getFileUrl());

        return ModeratorEvidenceResponse.builder()
                .id("ev-" + ev.getId())
                .rawId(ev.getId())
                .name(name)
                .type(type)
                .url(ev.getFileUrl())
                .build();
    }

    private String extractFileName(ReportEvidence ev) {
        if (StringUtils.hasText(ev.getFileName())) {
            return ev.getFileName();
        }
        if (StringUtils.hasText(ev.getFileUrl())) {
            String url = ev.getFileUrl();
            int slashIndex = url.lastIndexOf('/');
            if (slashIndex >= 0 && slashIndex < url.length() - 1) {
                String sub = url.substring(slashIndex + 1);
                int queryIndex = sub.indexOf('?');
                return queryIndex > 0 ? sub.substring(0, queryIndex) : sub;
            }
        }
        return "evidence_" + ev.getId() + ".jpg";
    }

    private String resolveEvidenceType(String evidenceType, String fileUrl) {
        String combined = ((evidenceType != null ? evidenceType : "") + " " + (fileUrl != null ? fileUrl : "")).toLowerCase();
        if (combined.contains("video") || combined.contains(".mp4") || combined.contains(".mov") || combined.contains(".webm")) {
            return "video";
        }
        if (combined.contains("pdf") || combined.contains("document") || combined.contains(".pdf")) {
            return "pdf";
        }
        return "image";
    }

    private int calculateEvidenceCompleteness(List<ReportEvidence> evidences) {
        if (evidences == null || evidences.isEmpty()) {
            return 10;
        }
        int score = 30;
        score += Math.min(evidences.size(), 3) * 15;
        boolean hasVerifiedOrOcr = evidences.stream().anyMatch(e ->
                StringUtils.hasText(e.getOcrText()) || EvidenceVerificationStatus.VERIFIED.name().equalsIgnoreCase(e.getVerificationStatus()));
        if (hasVerifiedOrOcr) {
            score += 15;
        }
        return Math.min(score, 100);
    }

    private String mapToUiStatus(String dbStatus, Boolean isLocked) {
        if (Boolean.TRUE.equals(isLocked) || "LOCKED".equalsIgnoreCase(dbStatus)) {
            return "Locked";
        }
        if (dbStatus == null) {
            return "Pending";
        }
        return switch (dbStatus.toUpperCase()) {
            case "PENDING" -> "Pending";
            case "IN_REVIEW" -> "In Review";
            case "APPROVED", "APPROVED_BLACKLIST", "VERIFIED" -> "Approved";
            case "REJECTED" -> "Rejected";
            default -> dbStatus;
        };
    }
}
