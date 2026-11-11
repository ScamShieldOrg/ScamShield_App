package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.NotificationType;

import com.be.scamshield.constant.ConfirmedIndicatorStatus;

import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.constant.PartnerVerificationStatus;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import com.be.scamshield.util.ReportStatusFilter;
import com.be.scamshield.util.ModeratorReportScope;
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
import com.be.scamshield.repository.ReportEvidenceRepository.DuplicateRow;
import com.be.scamshield.serviceImpl.EvidenceComparisonService.MatchRow;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorReportService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.query.QueryUtils;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Order;
import java.util.ArrayList;
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

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Pattern CASE_CODE_PATTERN = Pattern.compile("(?i)CS-\\d{4}-(\\d+)");
    private static final Set<ReportStatus> DECIDABLE_STATUSES = Set.of(
            ReportStatus.IN_REVIEW
    );

    private final IndicatorRepository indicatorRepository;
    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository reportEvidenceRepository;
    private final UserRepository userRepository;
    private final ModerationActionRepository moderationActionRepository;
    private final AuditLogRepository auditLogRepository;
    private final ConfirmedIndicatorRepository confirmedIndicatorRepository;
    private final NotificationRepository notificationRepository;
    private final ScamCategorieRepository scamCategorieRepository;
    private final ReputationTransactionRepository reputationTransactionRepository;
    private final WhitelistEntryRepository whitelistEntryRepository;
    private final ReportAssignmentService reviewAssignments;
    private final EvidenceComparisonService evidenceSimilarities;

    @Override
    @Transactional
    public PaginatedResponse<ModeratorReportResponse> getReportQueue(
            ModeratorReportFilterRequest filter,
            Pageable pageable, UserPrincipal currentUser) {

        ModeratorReportFilterRequest safeFilter = filter != null ? filter : new ModeratorReportFilterRequest();
        Specification<Report> spec = ModeratorReportScope.visibleTo(currentUser).and(createFilterSpecification(safeFilter));
        reviewAssignments.assignPendingReports();
        Sort queueSort = pageable.getSort();
        if (queueSort.getOrderFor("id") == null) {
            queueSort = queueSort.and(Sort.by("id"));
        }
        Sort stableSort = queueSort;
        Specification<Report> prioritized = spec.and((root, query, cb) -> {
            if (query != null && Report.class.equals(query.getResultType())) {
                var assignee = root.join("assignedModerator", JoinType.LEFT);
                var priority = cb.<Integer>selectCase()
                        .when(cb.equal(assignee.get("id"), currentUser.getId()), 0)
                        .otherwise(1);
                List<Order> orders = new ArrayList<>();
                orders.add(cb.asc(priority));
                orders.addAll(QueryUtils.toOrders(stableSort, root, cb));
                query.orderBy(orders);
            }
            return cb.conjunction();
        });
        Pageable pageWithoutSort = pageable.isPaged()
                ? PageRequest.of(pageable.getPageNumber(), pageable.getPageSize())
                : Pageable.unpaged();
        Page<Report> pageResult = reportRepository.findAll(prioritized, pageWithoutSort);

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

        Set<Long> indicatorIds = pageResult.getContent().stream().map(Report::getIndicator)
                .filter(Objects::nonNull).map(Indicator::getId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, List<ModeratorReportResponse.WhitelistMatch>> whitelistMap = indicatorIds.isEmpty() ? Map.of()
                : whitelistEntryRepository.findVerifiedForCheck(indicatorIds, PartnerVerificationStatus.VERIFIED, LocalDateTime.now())
                .stream().collect(Collectors.groupingBy(entry -> entry.getIndicator().getId(),
                        Collectors.mapping(this::mapWhitelistMatch, Collectors.toList())));
        Map<String, List<DuplicateRow>> duplicateMap = Map.of();
        QueueLookups lookups = new QueueLookups(whitelistMap, duplicateMap,
                Map.of());

        List<ModeratorReportResponse> responseList = pageResult.getContent().stream()
                .map(report -> mapToModeratorReportResponse(
                        report,
                        evidenceMap.getOrDefault(report.getId(), Collections.emptyList()), currentUser, lookups
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
    @Transactional
    public ModeratorQueueCountsResponse getQueueCounts(UserPrincipal currentUser) {
        Specification<Report> scope = ModeratorReportScope.visibleTo(currentUser);
        reviewAssignments.assignPendingReports();
        long all = reportRepository.count(scope);
        Specification<Report> pendingScope = scope.and((root, query, cb) -> cb.equal(root.get("status"), ReportStatus.PENDING));
        long pending = reportRepository.count(pendingScope);
        long inReview = reportRepository.count(scope.and((root, query, cb) -> cb.equal(root.get("status"), ReportStatus.IN_REVIEW)));

        return ModeratorQueueCountsResponse.builder()
                .all(all)
                .pending(pending)
                .inReview(inReview)
                .build();
    }

    @Override
    @Transactional
    public ModeratorReportResponse getReportById(Long id, UserPrincipal currentUser) {
        ModeratorReportScope.requireViewer(currentUser);
        reviewAssignments.assignPendingReports();
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ báo cáo với ID: " + id));
        List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(id);
        return mapToModeratorReportResponse(report, evidences, currentUser);
    }

    @Override
    @Transactional
    public ModeratorReportResponse makeDecision(
            Long reportId,
            UserPrincipal currentUser,
            ModeratorDecisionRequest request) {

        if (request == null || request.getDecision() == null) throw new BadRequestException("Quyết định không được để trống");
        String reason = request.getReason();
        if (request.getDecision() == ModeratorDecisionRequest.DecisionType.REJECT
                && (reason == null || reason.strip().length() < 20 || reason.strip().length() > 2000)) {
            throw new BadRequestException("Lý do từ chối phải từ 20 đến 2000 ký tự");
        }
        if (reason != null && reason.length() > 2000) throw new BadRequestException("Lý do tối đa 2000 ký tự");
        reason = StringUtils.hasText(reason) ? reason.strip() : "Phê duyệt báo cáo và toàn bộ bằng chứng";
        indicatorRepository.lockForReport(reportId);
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ báo cáo với ID: " + reportId));

        ReportStatus previousStatus = report.getStatus();
        if (previousStatus == null || !DECIDABLE_STATUSES.contains(previousStatus)) {
            if (previousStatus == ReportStatus.APPROVED || previousStatus == ReportStatus.REJECTED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Hồ sơ đã có quyết định xử lý trước đó");
            }
            throw new BadRequestException("Không thể xử lý hồ sơ ở trạng thái hiện tại (" + previousStatus + ")");
        }

        User moderatorUser = resolveModeratorUser(currentUser);
        reviewAssignments.requireAssigned(report, currentUser);
        LocalDateTime now = LocalDateTime.now();

        ReportStatus newReportStatus = switch (request.getDecision()) {
            case APPROVE -> ReportStatus.APPROVED;
            case REJECT -> ReportStatus.REJECTED;
        };
        if (newReportStatus == ReportStatus.APPROVED && report.getIndicator() != null
                && !whitelistEntryRepository.findVerifiedForCheck(List.of(report.getIndicator().getId()),
                        PartnerVerificationStatus.VERIFIED, now).isEmpty()) {
            throw new BadRequestException("Không thể phê duyệt báo cáo vì đối tượng đang thuộc danh sách tin cậy.");
        }

        // Determine optional matched ScamCategory from categoryId
        ScamCategory matchedCategory = null;
        if (request.getCategoryId() != null) {
            matchedCategory = scamCategorieRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy danh mục lừa đảo với ID: " + request.getCategoryId()));
        }

        List<Report> reportsToProcess = List.of(report);

        // Process all affected reports
        for (Report r : reportsToProcess) {
            ReportStatus prevStatus = r.getStatus();
            r.setStatus(newReportStatus);
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
                    .reason(reason)
                    .previousStatus(prevStatus.name())
                    .newStatus(newReportStatus.name())
                    .createdAt(now)
                    .build();
            moderationActionRepository.save(action);

            // Save AuditLog
            AuditLog auditLog = AuditLog.builder()
                    .actorUser(moderatorUser)
                    .action("MODERATION_" + request.getDecision().name())
                    .entityType("REPORT")
                    .entityId(r.getId())
                    .previousValue(prevStatus.name())
                    .newValue(newReportStatus.name())
                    .reason(reason)
                    .createdAt(now)
                    .build();
            auditLogRepository.save(auditLog);

            // Reporter rewards and notifications
            if (r.getReporterUser() != null) {
                User reporter = userRepository.findByIdForUpdate(r.getReporterUser().getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người gửi báo cáo"));
                String targetVal = r.getIndicator() != null ? r.getIndicator().getDisplayValue() : ("#RPT-" + r.getId());

                if (request.getDecision() == ModeratorDecisionRequest.DecisionType.APPROVE) {
                    // Reward reputation points only after approval (+50 points per report).
                    int bonusPoints = 50;
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
                            .type(NotificationType.REPORT)
                            .title("Báo cáo đã được phê duyệt")
                            .message("Báo cáo của bạn về " + targetVal + " đã được xác thực và đưa vào danh sách cảnh báo.")
                            
                            .referenceId(r.getId())
                            .isRead(false)
                            .createdAt(now)
                            .build();
                    notificationRepository.save(notification);
                } else {
                    // Send rejection notification
                    Notification notification = Notification.builder()
                            .user(reporter)
                            .type(NotificationType.REPORT)
                            .title("Báo cáo đã bị từ chối")
                            .message("Báo cáo của bạn về " + targetVal + " đã bị từ chối. Lý do: " + reason)
                            
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
                existing.setStatus(ConfirmedIndicatorStatus.ACTIVE);
                existing.setRetractedAt(null);
                existing.setRetractionReason(null);
                existing.setConfirmedAt(now);
                existing.setConfirmedByUser(moderatorUser);
                existing.setSourceReport(report);
                existing.setCategory(report.getCategory());
                existing.setPublicReason(reason);
                confirmedIndicatorRepository.save(existing);
            } else {
                ConfirmedIndicator newConfirmed = ConfirmedIndicator.builder()
                        .indicator(report.getIndicator())
                        .category(report.getCategory())
                        .status(ConfirmedIndicatorStatus.ACTIVE)
                        .confirmedByUser(moderatorUser)
                        .sourceReport(report)
                        .confirmedAt(now)
                        .publicReason(reason)
                        .build();
                confirmedIndicatorRepository.save(newConfirmed);
            }
        }

        List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(reportId);
        return mapToModeratorReportResponse(report, evidences, currentUser);
    }

    @Override
    @Transactional
    public ModeratorReportResponse startReview(Long id, UserPrincipal currentUser) {
        indicatorRepository.lockForReport(id);
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo"));
        reviewAssignments.requireAssigned(report, currentUser);
        if (report.getStatus() != ReportStatus.PENDING && report.getStatus() != ReportStatus.IN_REVIEW) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Báo cáo đã kết thúc xử lý");
        }
        if (report.getStatus() == ReportStatus.PENDING) {
            User moderator = resolveModeratorUser(currentUser);
            LocalDateTime now = LocalDateTime.now();
            report.setStatus(ReportStatus.IN_REVIEW);
            report.setUpdatedAt(now);
            reportRepository.save(report);
            if (!moderationActionRepository.existsByReportIdAndAction(id, "IN_REVIEW")) {
                moderationActionRepository.save(ModerationAction.builder().report(report).moderatorUser(moderator)
                        .action("IN_REVIEW").previousStatus("PENDING").newStatus("IN_REVIEW")
                        .reason("Báo cáo đang được kiểm duyệt").createdAt(now).build());
                auditLogRepository.save(AuditLog.builder().actorUser(moderator).entityType("REPORT").entityId(id)
                        .action("IN_REVIEW").previousValue("PENDING").newValue("IN_REVIEW")
                        .reason("Báo cáo đang được kiểm duyệt").createdAt(now).build());
            }
        }
        return mapToModeratorReportResponse(report, reportEvidenceRepository.findByReportId(id), currentUser);
    }

    private User resolveModeratorUser(UserPrincipal currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new BadRequestException("Thông tin định danh kiểm duyệt viên không hợp lệ");
        }
        return userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản kiểm duyệt viên với ID: " + currentUser.getId()));
    }

    private Specification<Report> createFilterSpecification(ModeratorReportFilterRequest filter) {
        ReportStatus tab = ReportStatusFilter.parse(filter.getTab());
        String search = filter.getSearch();
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Tab filtering
            if (tab != null) {
                predicates.add(cb.equal(root.get("status"), tab));
            }

            // 2. Search query filtering
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

    private ModeratorReportResponse mapToModeratorReportResponse(Report report, List<ReportEvidence> evidences, UserPrincipal currentUser) {
        ModeratorReportResponse response = mapToModeratorReportResponse(report, evidences, currentUser, null);
        reportRepository.findReviewStats(report.getId()).ifPresent(stats -> {
            var indicator = report.getIndicator();
            if (indicator != null) {
                response.setIndicatorContext(new ModeratorReportResponse.IndicatorContext(
                        stats.getBlacklistStatus(), stats.getIndicatorReports(), stats.getIndicatorApprovedReports(),
                        stats.getIndicatorRejectedReports(), stats.getIndicatorDisputes(),
                        indicator.getFirstSeenAt(), indicator.getLastSeenAt()));
            }
            var reporter = report.getReporterUser();
            if (reporter != null) {
                response.setReporterContext(new ModeratorReportResponse.ReporterContext(
                        reporter.getEmail(), reporter.getPhoneNumber(), reporter.getReputationPoints(),
                        reporter.getCreatedAt(), stats.getReporterReports(), stats.getApprovedReports(),
                        stats.getDecidedReports(), stats.getReporterDisputes(), stats.getApprovedDisputes(),
                        stats.getDecidedDisputes(), stats.getAbuseFlags(), stats.getOpenFlags()));
            }
        });
        return response;
    }

    private record QueueLookups(Map<Long, List<ModeratorReportResponse.WhitelistMatch>> whitelists,
                                Map<String, List<DuplicateRow>> duplicates, Map<Long, List<MatchRow>> similarities) { }

    private Map<Long, List<MatchRow>> loadSimilarities(List<ReportEvidence> evidences) {
        List<Long> ids = evidences.stream().map(ReportEvidence::getId).filter(Objects::nonNull).toList();
        return ids.isEmpty() ? Map.of() : evidenceSimilarities.findMatchesForEvidenceIds(ids).stream()
                .collect(Collectors.groupingBy(MatchRow::getSourceId));
    }

    private ModeratorReportResponse.WhitelistMatch mapWhitelistMatch(WhitelistEntry entry) {
        return new ModeratorReportResponse.WhitelistMatch(entry.getId(), entry.getPartner().getId(),
                entry.getPartner().getLegalName(), entry.getVerifiedAt());
    }

    private ModeratorReportResponse mapToModeratorReportResponse(Report report, List<ReportEvidence> evidences,
                                                                UserPrincipal currentUser, QueueLookups lookups) {
        User assignedModerator = report.getAssignedModerator();
        boolean assignedToMe = currentUser != null && assignedModerator != null
                && Objects.equals(assignedModerator.getId(), currentUser.getId());
        int year = report.getCreatedAt() != null ? report.getCreatedAt().getYear() : 2024;
        String formattedCode = String.format("CS-%d-%04d", year, report.getId());

        String targetIdentifier = "N/A";
        String targetType = null;
        if (report.getIndicator() != null) {
            targetType = report.getIndicator().getType() == null ? null : report.getIndicator().getType().name();
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
            if (StringUtils.hasText(user.getFullName())) {
                reportedBy = user.getFullName().strip();
            }
        }

        String reportedAt = report.getCreatedAt() != null
                ? report.getCreatedAt().format(DATE_TIME_FORMATTER)
                : "";

        Map<Long, List<MatchRow>> similarMatches = lookups == null ? loadSimilarities(evidences) : lookups.similarities();
        List<ModeratorEvidenceResponse> evidenceResponses = evidences.stream()
                .map(evidence -> lookups == null ? mapToModeratorEvidenceResponse(evidence, similarMatches.getOrDefault(evidence.getId(), List.of()))
                        : mapBatchEvidence(evidence, lookups.duplicates(), similarMatches.getOrDefault(evidence.getId(), List.of())))
                .toList();

        List<String> taxonomies = report.getCategory() != null
                ? List.of(report.getCategory().getName())
                : Collections.emptyList();

        List<ModeratorReportResponse.WhitelistMatch> whitelistMatches = report.getIndicator() == null ? List.of()
                : lookups != null ? lookups.whitelists().getOrDefault(report.getIndicator().getId(), List.of())
                : whitelistEntryRepository.findVerifiedForCheck(List.of(report.getIndicator().getId()),
                        PartnerVerificationStatus.VERIFIED, LocalDateTime.now()).stream()
                .map(this::mapWhitelistMatch).toList();

        String uiStatus = mapToUiStatus(report.getStatus() == null ? null : report.getStatus().name());

        return ModeratorReportResponse.builder()
                .id(formattedCode)
                .rawId(report.getId())
                .targetIdentifier(targetIdentifier)
                .targetType(targetType)
                .description(report.getDescription())
                .reportedMessage(report.getReportedMessage())
                .category(categoryName)
                .categoryId(categoryId)
                .canReview(assignedToMe && (report.getStatus() == ReportStatus.PENDING || report.getStatus() == ReportStatus.IN_REVIEW))
                .assignedToMe(assignedToMe)
                .whitelisted(!whitelistMatches.isEmpty())
                .whitelistMatches(whitelistMatches)
                .reportCount(1)
                .reportedBy(reportedBy)
                .reportedAt(reportedAt)
                .processedAt((report.getStatus() == ReportStatus.APPROVED || report.getStatus() == ReportStatus.REJECTED)
                        && report.getUpdatedAt() != null
                        ? report.getUpdatedAt().format(DATE_TIME_FORMATTER) : null)
                .status(uiStatus)
                // Theo yêu cầu của người dùng: Hiện tại các trường phán quyết AI để trống trong DTO
                .aiScore(null)
                .aiRiskLevel(null)
                .aiConfidence(null)
                .evidenceCount(evidenceResponses.size())
                .evidences(evidenceResponses)
                .taxonomies(taxonomies)
                .build();
    }

    private ModeratorEvidenceResponse mapToModeratorEvidenceResponse(ReportEvidence ev, List<MatchRow> matches) {
        return mapToModeratorEvidenceResponse(ev,
                StringUtils.hasText(ev.getFileHash()) ? reportEvidenceRepository.countByFileHashAndIdNot(ev.getFileHash(), ev.getId()) : 0,
                findDuplicates(ev), matches);
    }

    private ModeratorEvidenceResponse mapBatchEvidence(ReportEvidence evidence, Map<String, List<DuplicateRow>> byHash, List<MatchRow> matches) {
        List<DuplicateRow> rows = StringUtils.hasText(evidence.getFileHash())
                ? byHash.getOrDefault(evidence.getFileHash(), List.of()) : List.of();
        long count = rows.isEmpty() ? 0 : Math.max(0, rows.getFirst().getTotalCount() - 1);
        List<ModeratorEvidenceResponse.DuplicateEvidence> duplicates = rows.stream()
                .filter(row -> !Objects.equals(row.getEvidenceId(), evidence.getId())).limit(20)
                .map(row -> new ModeratorEvidenceResponse.DuplicateEvidence(row.getEvidenceId(), row.getReportId(),
                        row.getReportStatus(), row.getCreatedAt(), row.getReportUpdatedAt(), sameReporter(evidence, row.getReporterUserId())))
                .toList();
        return mapToModeratorEvidenceResponse(evidence, count, duplicates, matches);
    }

    private boolean sameReporter(ReportEvidence evidence, Long reporterId) {
        return reporterId != null && evidence.getReport() != null && evidence.getReport().getReporterUser() != null
                && Objects.equals(reporterId, evidence.getReport().getReporterUser().getId());
    }

    private ModeratorEvidenceResponse mapToModeratorEvidenceResponse(ReportEvidence ev, long duplicateCount,
                                                                    List<ModeratorEvidenceResponse.DuplicateEvidence> duplicates, List<MatchRow> matches) {
        String name = extractFileName(ev);
        String type = resolveEvidenceType(ev.getEvidenceType() == null ? null : ev.getEvidenceType().name(), ev.getFileUrl());

        return ModeratorEvidenceResponse.builder()
                .id("ev-" + ev.getId())
                .rawId(ev.getId())
                .name(name)
                .type(type)
                .duplicateCheckAvailable(StringUtils.hasText(ev.getFileHash()))
                .duplicateCount(duplicateCount)
                .duplicates(duplicates)
                .analysisStatus(ev.getAnalysisStatus() == null ? EvidenceAnalysisStatus.NOT_ANALYZED : ev.getAnalysisStatus())
                .analysisMessage(ev.getAnalysisMessage())
                .analyzedAt(ev.getAnalyzedAt())
                .imageFingerprintAvailable(ev.getPerceptualHash() != null)
                .ocrTextAvailable(StringUtils.hasText(ev.getOcrText()))
                .similarEvidenceCount(matches.isEmpty() ? 0 : matches.getFirst().getTotalCount())
                .similarEvidences(matches.stream().map(row -> {
                    List<String> types = new ArrayList<>();
                    if (row.getImageDistance() != null) types.add("PHASH");
                    if (row.getTextSimilarity() != null) types.add("OCR_TEXT");
                    return new ModeratorEvidenceResponse.SimilarEvidence(row.getEvidenceId(), row.getReportId(), row.getReportStatus(),
                            row.getCreatedAt(), row.getReportUpdatedAt(), sameReporter(ev, row.getReporterId()), types,
                            row.getImageDistance() == null ? null : 1.0 - row.getImageDistance() / 64.0, row.getTextSimilarity());
                }).toList())
                .url(ev.getFileUrl())
                .build();
    }

    private List<ModeratorEvidenceResponse.DuplicateEvidence> findDuplicates(ReportEvidence evidence) {
        if (!StringUtils.hasText(evidence.getFileHash())) return List.of();
        return reportEvidenceRepository.findTop20ByFileHashAndIdNotOrderByIdAsc(evidence.getFileHash(), evidence.getId()).stream()
                .filter(other -> !Objects.equals(other.getId(), evidence.getId()))
                .map(other -> new ModeratorEvidenceResponse.DuplicateEvidence(other.getId(), other.getReport().getId(),
                        other.getReport().getStatus() == null ? null : other.getReport().getStatus().name(),
                        other.getCreatedAt(), other.getReport().getUpdatedAt(), evidence.getReport() != null && evidence.getReport().getReporterUser() != null
                        && evidence.getReport().getReporterUser().getId() != null
                        && other.getReport().getReporterUser() != null
                        && Objects.equals(other.getReport().getReporterUser().getId(), evidence.getReport().getReporterUser().getId())))
                .toList();
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

    private String mapToUiStatus(String dbStatus) {
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
