package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.util.ReportStatusFilter;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.*;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import com.be.scamshield.service.IUserReportTrackingService;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserReportTrackingServiceImpl implements IUserReportTrackingService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("HH:mm, dd/MM/yyyy");

    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository reportEvidenceRepository;
    private final ModerationActionRepository moderationActionRepository;
    private final ScamCategorieRepository scamCategorieRepository;
    private final ReputationRankRepository reputationRankRepository;
    private final UserRepository userRepository;
    private final Clock applicationClock;

    @Override
    @Transactional(readOnly = true)
    public ReportSummaryMetricsResponse getSummaryMetrics(Long userId) {
        LocalDateTime now = LocalDateTime.now(applicationClock);
        LocalDateTime sevenDaysAgo = now.minusDays(7);

        long totalReports = reportRepository.countByReporterUserId(userId);
        long recentReports7Days = reportRepository.countByReporterUserIdAndCreatedAtAfter(userId, sevenDaysAgo);
        long blacklistedCount = reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.APPROVED);
        long pendingCount = reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.PENDING);

        // Estimated protected queries: 230 queries per blacklisted indicator reported
        long queriesProtected = blacklistedCount * 230L;

        // Accuracy rate = (blacklisted / totalProcessed) * 100
        long withdrawnCount = reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.WITHDRAWN);
        long processedCount = totalReports - pendingCount - withdrawnCount;
        double accuracyRate = 0.0;
        if (processedCount > 0) {
            accuracyRate = Math.round(((double) blacklistedCount / processedCount) * 1000.0) / 10.0;
        }

        User user = userRepository.findById(userId).orElse(null);
        int reputationPoints = (user != null && user.getReputationPoints() != null) ? user.getReputationPoints() : 0;

        String rankTitle = "Tân Binh Sentinel";
        int currentTierProgress = reputationPoints;
        int maxTierPoints = 700;

        if (user != null && user.getReputationRank() != null) {
            ReputationRank rank = user.getReputationRank();
            rankTitle = rank.getName();
            int minPoints = rank.getMinPoints() != null ? rank.getMinPoints() : 0;
            maxTierPoints = rank.getMaxPoints() != null ? rank.getMaxPoints() : (minPoints + 200);
            currentTierProgress = Math.min(reputationPoints, maxTierPoints);
        } else {
            Optional<ReputationRank> rankOpt = reputationRankRepository.findRankByPoints(reputationPoints);
            if (rankOpt.isPresent()) {
                ReputationRank rank = rankOpt.get();
                rankTitle = rank.getName();
                int minPoints = rank.getMinPoints() != null ? rank.getMinPoints() : 0;
                maxTierPoints = rank.getMaxPoints() != null ? rank.getMaxPoints() : (minPoints + 200);
                currentTierProgress = Math.min(reputationPoints, maxTierPoints);
            }
        }

        return ReportSummaryMetricsResponse.builder()
                .totalReports(totalReports)
                .recentReports7Days(recentReports7Days)
                .blacklistedCount(blacklistedCount)
                .queriesProtected(queriesProtected)
                .accuracyRate(accuracyRate)
                .rankTitle(rankTitle)
                .reputationPoints(reputationPoints)
                .currentTierProgress(currentTierProgress)
                .maxTierPoints(maxTierPoints)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ReportStatusCountsResponse getStatusCounts(Long userId) {
        long all = reportRepository.countByReporterUserId(userId);
        long pending = reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.PENDING);
        long approvedBlacklist = reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.APPROVED);
        long mergedDuplicate = 0;
        long rejected = reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.REJECTED);

        return ReportStatusCountsResponse.builder()
                .withdrawn(reportRepository.countByReporterUserIdAndStatus(userId, ReportStatus.WITHDRAWN))
                .all(all)
                .pending(pending)
                .approvedBlacklist(approvedBlacklist)
                .mergedDuplicate(mergedDuplicate)
                .rejected(rejected)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<TrackingReportResponse> getTrackingReports(
            Long userId,
            String search,
            String status,
            Long categoryId,
            Integer days,
            Pageable pageable) {

        Specification<Report> spec = createFilterSpecification(userId, search, status, categoryId, days);
        Page<Report> pageResult = reportRepository.findAll(spec, pageable);

        if (pageResult.isEmpty()) {
            return PaginatedResponse.buildPaginatedResponse(pageResult.map(r -> null));
        }

        List<Long> reportIds = pageResult.getContent().stream()
                .map(Report::getId)
                .toList();

        Map<Long, List<ReportEvidence>> evidenceMap = reportEvidenceRepository.findByReportIdIn(reportIds).stream()
                .collect(Collectors.groupingBy(ev -> ev.getReport().getId()));

        Map<Long, List<ModerationAction>> moderationMap = moderationActionRepository.findByReportIdInOrderByCreatedAtDesc(reportIds).stream()
                .collect(Collectors.groupingBy(act -> act.getReport().getId()));

        LocalDateTime now = LocalDateTime.now(applicationClock);

        List<TrackingReportResponse> responses = pageResult.getContent().stream()
                .map(report -> mapToTrackingResponse(
                        report,
                        evidenceMap.getOrDefault(report.getId(), Collections.emptyList()),
                        moderationMap.getOrDefault(report.getId(), Collections.emptyList()),
                        now
                ))
                .toList();

        PaginatedResponse<TrackingReportResponse> response = new PaginatedResponse<>();
        response.setData(responses);
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
    public byte[] exportTrackingReportsCsv(
            Long userId,
            String search,
            String status,
            Long categoryId,
            Integer days) {

        Specification<Report> spec = createFilterSpecification(userId, search, status, categoryId, days);
        List<Report> reports = reportRepository.findAll(spec);

        List<Long> reportIds = reports.stream().map(Report::getId).toList();
        Map<Long, List<ReportEvidence>> evidenceMap = reportEvidenceRepository.findByReportIdIn(reportIds).stream()
                .collect(Collectors.groupingBy(ev -> ev.getReport().getId()));

        Map<Long, List<ModerationAction>> moderationMap = moderationActionRepository.findByReportIdInOrderByCreatedAtDesc(reportIds).stream()
                .collect(Collectors.groupingBy(act -> act.getReport().getId()));

        LocalDateTime now = LocalDateTime.now(applicationClock);

        StringBuilder csv = new StringBuilder();
        // UTF-8 BOM so Excel opens with proper Vietnamese character encoding
        csv.append('\uFEFF');
        csv.append("\"Mã báo cáo\",\"Mã băm (Hash)\",\"Loại mục tiêu\",\"Mục tiêu nghi vấn\",\"Thông tin mục tiêu\",\"Thủ đoạn\",\"Ngày gửi\",\"Tiến độ SLA\",\"Trạng thái SLA\",\"Bằng chứng\",\"Trạng thái\"\n");

        for (Report report : reports) {
            TrackingReportResponse item = mapToTrackingResponse(
                    report,
                    evidenceMap.getOrDefault(report.getId(), Collections.emptyList()),
                    moderationMap.getOrDefault(report.getId(), Collections.emptyList()),
                    now
            );

            csv.append(escapeCsv(item.getId())).append(',')
                    .append(escapeCsv(item.getHashId())).append(',')
                    .append(escapeCsv(item.getTargetType())).append(',')
                    .append(escapeCsv(item.getTargetValue())).append(',')
                    .append(escapeCsv(item.getTargetSub())).append(',')
                    .append(escapeCsv(item.getCategory())).append(',')
                    .append(escapeCsv(item.getSubmittedDate())).append(',')
                    .append(escapeCsv(item.getSlaTime())).append(',')
                    .append(escapeCsv(item.getSlaStatus())).append(',')
                    .append(escapeCsv(item.getEvidenceBadge())).append(',')
                    .append(escapeCsv(item.getStatus())).append('\n');
        }

        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportDetailTrackingResponse getReportDetail(Long userId, Long reportId) {
        Report report = reportRepository.findByIdAndReporterUserId(reportId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo #" + reportId + " hoặc bạn không có quyền truy cập"));

        List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(reportId);
        List<ModerationAction> moderationActions = moderationActionRepository.findByReportIdOrderByCreatedAtDesc(reportId);

        LocalDateTime now = LocalDateTime.now(applicationClock);
        SlaInfo slaInfo = calculateSla(report, moderationActions, now);

        String fullHash = resolveFullHash(report);
        String shortHash = formatShortHash(fullHash);

        String targetType = resolveTargetType(report);
        String targetValue = resolveTargetValue(report);
        String targetSub = resolveTargetSub(report, targetType);

        List<ReportDetailTrackingResponse.EvidenceDetailDto> evidenceDtos = evidences.stream()
                .map(ev -> ReportDetailTrackingResponse.EvidenceDetailDto.builder()
                        .id(ev.getId())
                        .evidenceType(ev.getEvidenceType() == null ? null : ev.getEvidenceType().name())
                        .fileUrl(ev.getFileUrl())
                        .fileName(ev.getFileName())
                        .fileHash(ev.getFileHash())
                        .ocrText(ev.getOcrText())
                        .verificationStatus(ev.getVerificationStatus() == null ? null : ev.getVerificationStatus().name())
                        .createdAt(ev.getCreatedAt())
                        .build())
                .toList();

        List<ReportDetailTrackingResponse.ModerationStepDto> modDtos = moderationActions.stream()
                .map(m -> ReportDetailTrackingResponse.ModerationStepDto.builder()
                        .id(m.getId())
                        .action(m.getAction())
                        .reason(m.getReason())
                        .previousStatus(m.getPreviousStatus())
                        .newStatus(m.getNewStatus())
                        .moderatorName(m.getModeratorUser() != null ? m.getModeratorUser().getFullName() : "Hệ thống A05/NCSC")
                        .createdAt(m.getCreatedAt())
                        .build())
                .toList();

        return ReportDetailTrackingResponse.builder()
                .id(String.format("#RPT-%04d", report.getId()))
                .rawId(report.getId())
                .fullHash(fullHash)
                .hashId(shortHash)
                .targetType(targetType)
                .targetValue(targetValue)
                .targetSub(targetSub)
                .category(report.getCategory() != null ? report.getCategory().getName() : "Chưa phân loại")
                .categoryId(report.getCategory() == null ? null : report.getCategory().getId())
                .regionCode(report.getRegionCode() == null ? null : report.getRegionCode().getCode())
                .reportedMessage(report.getReportedMessage())
                .description(report.getDescription())
                .status(report.getStatus() == null ? null : report.getStatus().name())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .slaTime(slaInfo.slaTime())
                .slaStatus(slaInfo.slaStatus())
                .evidences(evidenceDtos)
                .moderationHistory(modDtos)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ScamCategoryResponse> getCategories() {
        return scamCategorieRepository.findByIsActiveTrueOrderByNameAsc().stream()
                .map(cat -> ScamCategoryResponse.builder()
                        .id(cat.getId())
                        .code(cat.getCode())
                        .name(cat.getName())
                        .description(cat.getDescription())
                        .build())
                .toList();
    }

    // --- Private helper methods ---

    private Specification<Report> createFilterSpecification(
            Long userId,
            String search,
            String status,
            Long categoryId,
            Integer days) {
        ReportStatus statusFilter = ReportStatusFilter.parse(status);
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Mandatory filter by user
            predicates.add(cb.equal(root.get("reporterUser").get("id"), userId));

            // 2. Filter by status
            if (statusFilter != null) {
                predicates.add(cb.equal(root.get("status"), statusFilter));
            }

            // 3. Filter by category
            if (categoryId != null && categoryId > 0) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }

            // 4. Filter by days
            if (days != null && days > 0) {
                LocalDateTime threshold = LocalDateTime.now(applicationClock).minusDays(days);
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), threshold));
            }

            // 5. Keyword search
            if (search != null && !search.isBlank()) {
                String cleanSearch = search.trim();
                String term = "%" + cleanSearch.toLowerCase(Locale.ROOT) + "%";

                Join<Report, Indicator> indicatorJoin = root.join("indicator", JoinType.LEFT);
                Join<Report, ScamCategory> categoryJoin = root.join("category", JoinType.LEFT);

                List<Predicate> searchPredicates = new ArrayList<>();
                searchPredicates.add(cb.like(cb.lower(indicatorJoin.get("normalizedValue")), term));
                searchPredicates.add(cb.like(cb.lower(indicatorJoin.get("displayValue")), term));
                searchPredicates.add(cb.like(cb.lower(categoryJoin.get("name")), term));
                searchPredicates.add(cb.like(cb.lower(root.get("description")), term));
                searchPredicates.add(cb.like(cb.lower(root.get("reportedMessage")), term));

                // Also match report ID like #RPT-8492 or number 8492
                String idNumeric = cleanSearch.replaceAll("[^0-9]", "");
                if (!idNumeric.isBlank()) {
                    try {
                        Long parsedId = Long.parseLong(idNumeric);
                        searchPredicates.add(cb.equal(root.get("id"), parsedId));
                    } catch (NumberFormatException ignored) {
                    }
                }

                predicates.add(cb.or(searchPredicates.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private TrackingReportResponse mapToTrackingResponse(
            Report report,
            List<ReportEvidence> evidences,
            List<ModerationAction> moderationActions,
            LocalDateTime now) {

        String targetType = resolveTargetType(report);
        String targetValue = resolveTargetValue(report);
        String targetSub = resolveTargetSub(report, targetType);

        String fullHash = resolveFullHash(report);
        String shortHash = formatShortHash(fullHash);

        SlaInfo slaInfo = calculateSla(report, moderationActions, now);
        String evidenceBadge = buildEvidenceBadge(evidences);

        String categoryName = report.getCategory() != null ? report.getCategory().getName() : "Chưa phân loại";
        Long catId = report.getCategory() != null ? report.getCategory().getId() : null;

        String formattedDate = report.getCreatedAt() != null
                ? report.getCreatedAt().format(DATE_FORMATTER)
                : "";

        return TrackingReportResponse.builder()
                .id(String.format("#RPT-%04d", report.getId()))
                .rawId(report.getId())
                .hashId(shortHash)
                .targetType(targetType)
                .targetValue(targetValue)
                .targetSub(targetSub)
                .category(categoryName)
                .categoryId(catId)
                .submittedDate(formattedDate)
                .slaTime(slaInfo.slaTime())
                .slaStatus(slaInfo.slaStatus())
                .evidenceBadge(evidenceBadge)
                .evidenceCount(evidences.size())
                .status(report.getStatus() == null ? null : report.getStatus().name())
                .build();
    }

    private String resolveTargetType(Report report) {
        if (report.getIndicator() != null && report.getIndicator().getType() != null) {
            String type = report.getIndicator().getType().toUpperCase(Locale.ROOT);
            if (type.contains("PHONE")) return "PHONE";
            if (type.contains("BANK")) return "BANK";
            if (type.contains("WEB") || type.contains("DOMAIN") || type.contains("URL")) return "WEBSITE";
            if (type.contains("TELEGRAM") || type.contains("SOCIAL")) return "TELEGRAM";
            if (type.contains("APK") || type.contains("APP") || type.contains("FILE")) return "APK";
            return type;
        }
        return "PHONE";
    }

    private String resolveTargetValue(Report report) {
        if (report.getIndicator() != null) {
            if (report.getIndicator().getDisplayValue() != null && !report.getIndicator().getDisplayValue().isBlank()) {
                return report.getIndicator().getDisplayValue();
            }
            if (report.getIndicator().getNormalizedValue() != null) {
                return report.getIndicator().getNormalizedValue();
            }
        }
        return "Không xác định";
    }

    private String resolveTargetSub(Report report, String targetType) {
        if (report.getDescription() != null && !report.getDescription().isBlank() && report.getDescription().length() < 60) {
            return report.getDescription();
        }
        return switch (targetType) {
            case "PHONE" -> "Đầu số phát tán tin rác / lừa đảo";
            case "BANK" -> "Tài khoản nhận tiền nghi vấn";
            case "WEBSITE" -> "Máy chủ Web Phishing giả mạo";
            case "TELEGRAM" -> "Kênh / Nhóm viễn thông xã hội";
            case "APK" -> "Tệp cài đặt chứa mã độc gián điệp";
            default -> "Mục tiêu nghi vấn số";
        };
    }

    private String resolveFullHash(Report report) {
        // Generate reproducible SHA-256 hash from id and createdAt
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String raw = "RPT-" + (report != null ? report.getId() : "") + "-" + (report != null ? report.getCreatedAt() : "");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return UUID.randomUUID().toString().replace("-", "");
        }
    }

    private String formatShortHash(String fullHash) {
        if (fullHash == null || fullHash.length() < 8) {
            return "0000...0000";
        }
        return fullHash.substring(0, 4) + "..." + fullHash.substring(fullHash.length() - 4);
    }

    private SlaInfo calculateSla(Report report, List<ModerationAction> moderationActions, LocalDateTime now) {
        String status = report.getStatus() != null ? report.getStatus().name() : "PENDING";

        if ("WITHDRAWN".equals(status)) return new SlaInfo("Đã thu hồi", "withdrawn");


        LocalDateTime createdAt = report.getCreatedAt() != null ? report.getCreatedAt() : now;

        if ("PENDING".equals(status) || "IN_REVIEW".equals(status)) {
            long minutes = Math.max(1, ChronoUnit.MINUTES.between(createdAt, now));
            String timeText;
            if (minutes < 60) {
                timeText = String.format("Đang xử lý (%d phút)", minutes);
            } else if (minutes < 1440) {
                timeText = String.format("Đang xử lý (%d giờ)", minutes / 60);
            } else {
                timeText = String.format("Đang xử lý (%d ngày)", minutes / 1440);
            }
            return new SlaInfo(timeText, "processing");
        }

        // Completed (APPROVED, REJECTED)
        LocalDateTime finishedAt = report.getUpdatedAt() != null ? report.getUpdatedAt() : now;
        if (!moderationActions.isEmpty() && moderationActions.get(0).getCreatedAt() != null) {
            finishedAt = moderationActions.get(0).getCreatedAt();
        }

        long diffMinutes = Math.max(1, ChronoUnit.MINUTES.between(createdAt, finishedAt));
        String timeText;
        if (diffMinutes < 60) {
            timeText = String.format("Xong trong %d phút", diffMinutes);
        } else if (diffMinutes < 1440) {
            timeText = String.format("Xong trong %d giờ", diffMinutes / 60);
        } else {
            timeText = String.format("Xong trong %d ngày", diffMinutes / 1440);
        }
        return new SlaInfo(timeText, "completed");
    }

    private String buildEvidenceBadge(List<ReportEvidence> evidences) {
        if (evidences.isEmpty()) {
            return "Chưa có bằng chứng";
        }

        boolean hasOcr = evidences.stream().anyMatch(e -> e.getOcrText() != null && !e.getOcrText().isBlank());
        int count = evidences.size();
        if (hasOcr) return count + " ảnh • OCR Pass";
        return count + " tệp đính kèm";
    }

    private String escapeCsv(String value) {
        if (value == null) return "\"\"";
        if (!value.isEmpty()) {
            char firstChar = value.charAt(0);
            if (firstChar == '=' || firstChar == '+' || firstChar == '-' || firstChar == '@' || firstChar == '\t' || firstChar == '\r') {
                value = "'" + value;
            }
        }
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }

    private record SlaInfo(String slaTime, String slaStatus) {}
}
