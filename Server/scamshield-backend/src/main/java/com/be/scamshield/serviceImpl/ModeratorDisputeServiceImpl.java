package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;

import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.request.DisputeVerdictRequest;
import com.be.scamshield.dto.request.ModeratorDisputeFilterRequest;
import com.be.scamshield.dto.response.ModeratorDisputeQueueResponse;
import com.be.scamshield.dto.response.ModeratorDisputeResponse;
import com.be.scamshield.dto.response.ModeratorEvidenceResponse;
import com.be.scamshield.entity.*;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import com.be.scamshield.service.IModeratorDisputeService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class ModeratorDisputeServiceImpl implements IModeratorDisputeService {

    private static final DateTimeFormatter DISPUTE_TIME_FORMATTER = DateTimeFormatter.ofPattern("dd/MM HH:mm");
    private static final Pattern DISPUTE_CODE_PATTERN = Pattern.compile("^AP-(?:\\d{4}-)?(\\d+)$", Pattern.CASE_INSENSITIVE);
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DisputeRepository disputeRepository;
    private final DisputeEvidenceRepository evidenceRepository;
    private final ConfirmedIndicatorRepository confirmedIndicatorRepository;
    private final UserRepository userRepository;
    private final AuditLogRepository auditLogRepository;
    private final SupabaseStorageService storageService;

    @Override
    @Transactional(readOnly = true)
    public ModeratorDisputeQueueResponse getDisputeQueue(ModeratorDisputeFilterRequest filter, Pageable pageable) {
        ModeratorDisputeFilterRequest safeFilter = filter != null ? filter : new ModeratorDisputeFilterRequest();
        Specification<Dispute> spec = createSpecification(safeFilter);

        Page<Dispute> pageResult = disputeRepository.findAll(spec, pageable);

        long pendingCount = disputeRepository.countByStatusIn(List.of(
                DisputeStatus.PENDING,
                DisputeStatus.IN_REVIEW,
                DisputeStatus.NEEDS_MORE_INFO
        ));

        if (pageResult.isEmpty()) {
            return ModeratorDisputeQueueResponse.builder()
                    .items(Collections.emptyList())
                    .pendingCount(pendingCount)
                    .currentPage(pageResult.getNumber())
                    .pageSize(pageResult.getSize())
                    .totalItems(pageResult.getTotalElements())
                    .totalPages(pageResult.getTotalPages())
                    .hasNext(pageResult.hasNext())
                    .hasPrevious(pageResult.hasPrevious())
                    .build();
        }

        List<Long> disputeIds = pageResult.getContent().stream()
                .map(Dispute::getId)
                .toList();

        Map<Long, List<DisputeEvidence>> evidenceMap = new HashMap<>();
        for (Long dId : disputeIds) {
            evidenceMap.put(dId, evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(dId));
        }

        List<ModeratorDisputeResponse> items = pageResult.getContent().stream()
                .map(dispute -> mapToModeratorDisputeResponse(
                        dispute,
                        evidenceMap.getOrDefault(dispute.getId(), Collections.emptyList())
                ))
                .toList();

        return ModeratorDisputeQueueResponse.builder()
                .items(items)
                .pendingCount(pendingCount)
                .currentPage(pageResult.getNumber())
                .pageSize(pageResult.getSize())
                .totalItems(pageResult.getTotalElements())
                .totalPages(pageResult.getTotalPages())
                .hasNext(pageResult.hasNext())
                .hasPrevious(pageResult.hasPrevious())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ModeratorDisputeResponse getDisputeById(String idOrCode) {
        Long disputeId = parseDisputeId(idOrCode);
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ khiếu nại với mã/ID: " + idOrCode));

        List<DisputeEvidence> evidences = evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(disputeId);
        return mapToModeratorDisputeResponse(dispute, evidences);
    }

    @Override
    @Transactional
    public ModeratorDisputeResponse makeDecision(String idOrCode, DisputeVerdictRequest request, String currentModeratorUsername) {
        Long disputeId = parseDisputeId(idOrCode);
        Dispute dispute = disputeRepository.findById(disputeId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ khiếu nại với mã/ID: " + idOrCode));

        if (dispute.getStatus() == DisputeStatus.APPROVED 
                || dispute.getStatus() == DisputeStatus.REJECTED 
                || dispute.getStatus() == DisputeStatus.DRAFT) {
            throw new BadRequestException("Không thể ra phán quyết cho hồ sơ khiếu nại có trạng thái: " + dispute.getStatus());
        }

        String rawVerdict = request.getVerdict().trim().toUpperCase(Locale.ROOT);
        boolean isRetract;
        if ("RETRACT".equals(rawVerdict) || "APPROVED".equals(rawVerdict) || "ACCEPT".equals(rawVerdict)) {
            isRetract = true;
        } else if ("UPHOLD".equals(rawVerdict) || "REJECTED".equals(rawVerdict) || "REJECT".equals(rawVerdict)) {
            isRetract = false;
        } else {
            throw new BadRequestException("Phán quyết không hợp lệ: " + request.getVerdict() + ". Giá trị cho phép: RETRACT (Thu hồi chỉ số) hoặc UPHOLD (Duy trì quyết định).");
        }

        User moderator = null;
        if (StringUtils.hasText(currentModeratorUsername)) {
            moderator = userRepository.findByEmailOrPhoneNumber(currentModeratorUsername)
                    .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản kiểm duyệt viên: " + currentModeratorUsername));
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        String previousStatus = dispute.getStatus() != null ? dispute.getStatus().name() : "PENDING";

        if (isRetract) {
            // Retract scam indicator from blacklist
            dispute.setStatus(DisputeStatus.APPROVED);
            if (dispute.getConfirmedIndicator() != null) {
                ConfirmedIndicator confirmed = dispute.getConfirmedIndicator();
                confirmed.setStatus("RETRACTED");
                confirmed.setRetractedAt(now);
                confirmed.setRetractionReason(request.getReason());
                confirmedIndicatorRepository.save(confirmed);
                log.info("Moderator {} retracted confirmed indicator ID {} via dispute {}",
                        currentModeratorUsername, confirmed.getId(), disputeId);
            }
        } else {
            // Uphold original verdict (reject dispute)
            dispute.setStatus(DisputeStatus.REJECTED);
            log.info("Moderator {} upheld original report verdict, rejecting dispute ID {}",
                    currentModeratorUsername, disputeId);
        }

        dispute.setResolvedByUser(moderator);
        dispute.setResolvedAt(now);
        dispute.setResolutionReason(request.getReason());
        dispute.setUpdatedAt(now);
        Dispute savedDispute = disputeRepository.save(dispute);

        // Record Audit Log for governance
        recordAuditLog(
                moderator,
                "DISPUTE_VERDICT",
                savedDispute.getId(),
                previousStatus,
                savedDispute.getStatus().name(),
                (isRetract ? "RETRACT (Thu hồi chỉ số): " : "UPHOLD (Duy trì quyết định): ") + request.getReason()
        );

        List<DisputeEvidence> evidences = evidenceRepository.findByDisputeIdOrderByCreatedAtAscIdAsc(savedDispute.getId());
        return mapToModeratorDisputeResponse(savedDispute, evidences);
    }

    private Specification<Dispute> createSpecification(ModeratorDisputeFilterRequest filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Always hide unfinished drafts from moderator queue
            predicates.add(cb.notEqual(root.get("status"), DisputeStatus.DRAFT));

            // Status filter
            if (StringUtils.hasText(filter.getStatus()) && !"ALL".equalsIgnoreCase(filter.getStatus().trim())) {
                String normalizedStatus = filter.getStatus().trim().toUpperCase(Locale.ROOT);
                if (normalizedStatus.contains("PENDING") || normalizedStatus.contains("IN_REVIEW") || normalizedStatus.contains("ĐANG XÉT")) {
                    predicates.add(root.get("status").in(List.of(
                            DisputeStatus.PENDING,
                            DisputeStatus.IN_REVIEW,
                            DisputeStatus.NEEDS_MORE_INFO
                    )));
                } else if (normalizedStatus.contains("APPROV") || normalizedStatus.contains("CHẤP NHẬN") || normalizedStatus.contains("CHAP NHAN")) {
                    predicates.add(cb.equal(root.get("status"), DisputeStatus.APPROVED));
                } else if (normalizedStatus.contains("REJECT") || normalizedStatus.contains("TỪ CHỐI") || normalizedStatus.contains("TU CHOI")) {
                    predicates.add(cb.equal(root.get("status"), DisputeStatus.REJECTED));
                }
            }

            // Search filter
            if (StringUtils.hasText(filter.getSearch())) {
                String term = "%" + filter.getSearch().trim().toLowerCase(Locale.ROOT) + "%";
                Long searchId = extractNumericId(filter.getSearch().trim());

                List<Predicate> searchPredicates = new ArrayList<>();
                if (searchId != null) {
                    searchPredicates.add(cb.equal(root.get("id"), searchId));
                }

                searchPredicates.add(cb.like(cb.lower(root.get("submitterName")), term));
                searchPredicates.add(cb.like(cb.lower(root.get("submitterContact")), term));
                searchPredicates.add(cb.like(cb.lower(root.get("draftIndicatorValue")), term));

                // Joined relationships: confirmedIndicator -> indicator
                var confirmedJoin = root.join("confirmedIndicator", jakarta.persistence.criteria.JoinType.LEFT);
                var indicatorJoin = confirmedJoin.join("indicator", jakarta.persistence.criteria.JoinType.LEFT);
                var categoryJoin = confirmedJoin.join("category", jakarta.persistence.criteria.JoinType.LEFT);

                searchPredicates.add(cb.like(cb.lower(indicatorJoin.get("normalizedValue")), term));
                searchPredicates.add(cb.like(cb.lower(indicatorJoin.get("displayValue")), term));
                searchPredicates.add(cb.like(cb.lower(categoryJoin.get("name")), term));

                predicates.add(cb.or(searchPredicates.toArray(new Predicate[0])));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Long extractNumericId(String search) {
        if (!StringUtils.hasText(search)) {
            return null;
        }
        if (search.matches("^\\d+$")) {
            try {
                return Long.parseLong(search);
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        Matcher matcher = DISPUTE_CODE_PATTERN.matcher(search);
        if (matcher.matches()) {
            try {
                return Long.parseLong(matcher.group(1));
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    private Long parseDisputeId(String idOrCode) {
        if (!StringUtils.hasText(idOrCode)) {
            throw new BadRequestException("Mã hoặc ID hồ sơ khiếu nại không hợp lệ");
        }
        String trimmed = idOrCode.trim();
        if (trimmed.matches("^\\d+$")) {
            return Long.parseLong(trimmed);
        }
        Matcher matcher = DISPUTE_CODE_PATTERN.matcher(trimmed);
        if (matcher.matches()) {
            return Long.parseLong(matcher.group(1));
        }
        throw new BadRequestException("Định dạng mã khiếu nại không hợp lệ: " + idOrCode + ". Hỗ trợ định dạng số hoặc AP-2024-XXXX.");
    }

    private ModeratorDisputeResponse mapToModeratorDisputeResponse(Dispute dispute, List<DisputeEvidence> evidences) {
        int year = dispute.getCreatedAt() != null ? dispute.getCreatedAt().getYear() : 2024;
        String formattedDisputeId = String.format("AP-%d-%04d", year, dispute.getId());

        String originalReportId = null;
        String targetIdentifier = "N/A";
        String targetType = "PHONE";
        String categoryName = "Chưa phân loại";
        String originalDecision = "Approved";

        if (dispute.getConfirmedIndicator() != null) {
            ConfirmedIndicator ci = dispute.getConfirmedIndicator();

            if (ci.getSourceReport() != null) {
                int repYear = ci.getSourceReport().getCreatedAt() != null ? ci.getSourceReport().getCreatedAt().getYear() : 2024;
                originalReportId = String.format("CS-%d-%04d", repYear, ci.getSourceReport().getId());
            } else {
                originalReportId = String.format("CS-%d-%04d", 2024, ci.getId() + 1800);
            }

            if (ci.getIndicator() != null) {
                targetType = ci.getIndicator().getType();
                targetIdentifier = StringUtils.hasText(ci.getIndicator().getDisplayValue())
                        ? ci.getIndicator().getDisplayValue()
                        : ci.getIndicator().getNormalizedValue();
            }

            if (ci.getCategory() != null && StringUtils.hasText(ci.getCategory().getName())) {
                categoryName = ci.getCategory().getName();
            }

            if ("RETRACTED".equalsIgnoreCase(ci.getStatus())) {
                originalDecision = "Rejected";
            }
        } else if (StringUtils.hasText(dispute.getDraftIndicatorValue())) {
            targetIdentifier = dispute.getDraftIndicatorValue();
            targetType = dispute.getDraftIndicatorType() != null ? dispute.getDraftIndicatorType().name() : "PHONE";
        }

        String disputedBy = "Ẩn danh";
        if (StringUtils.hasText(dispute.getSubmitterName())) {
            disputedBy = dispute.getSubmitterName();
        } else if (dispute.getSubmittedByUser() != null) {
            User user = dispute.getSubmittedByUser();
            if (StringUtils.hasText(user.getEmail())) {
                disputedBy = user.getEmail().split("@")[0];
            } else if (StringUtils.hasText(user.getFullName())) {
                disputedBy = user.getFullName();
            }
        }

        String disputedAt = dispute.getCreatedAt() != null
                ? dispute.getCreatedAt().format(DISPUTE_TIME_FORMATTER)
                : "";

        String disputeReason = dispute.getReason() != null ? dispute.getReason() : "";
        if (disputeReason.startsWith("DISPUTE-MOCK:") && disputeReason.contains(" — ")) {
            disputeReason = disputeReason.substring(disputeReason.indexOf(" — ") + 3);
        }

        String uiStatus = mapToUiStatus(dispute.getStatus());

        List<ModeratorEvidenceResponse> evidenceResponses = evidences.stream()
                .map(this::mapToModeratorEvidenceResponse)
                .toList();

        String assignedTo = dispute.getAssignedToUser() != null ? dispute.getAssignedToUser().getFullName() : null;
        String resolvedBy = dispute.getResolvedByUser() != null ? dispute.getResolvedByUser().getFullName() : null;

        return ModeratorDisputeResponse.builder()
                .id(formattedDisputeId)
                .rawId(dispute.getId())
                .originalReportId(originalReportId)
                .targetIdentifier(targetIdentifier)
                .targetType(targetType)
                .category(categoryName)
                .disputedBy(disputedBy)
                .disputedAt(disputedAt)
                .createdAt(dispute.getCreatedAt())
                .status(uiStatus)
                .statusCode(dispute.getStatus())
                .originalDecision(originalDecision)
                .disputeReason(disputeReason)
                .legalRelationship(dispute.getLegalRelationship() != null ? dispute.getLegalRelationship().name() : null)
                .submitterContact(dispute.getSubmitterContact())
                .evidences(evidenceResponses)
                .evidenceCount(evidenceResponses.size())
                .assignedTo(assignedTo)
                .resolvedBy(resolvedBy)
                .resolvedAt(dispute.getResolvedAt())
                .resolutionReason(dispute.getResolutionReason())
                .build();
    }

    private String mapToUiStatus(DisputeStatus status) {
        if (status == null) return "Đang xét";
        return switch (status) {
            case APPROVED -> "Chấp nhận";
            case REJECTED -> "Từ chối";
            case DRAFT -> "Bản nháp";
            default -> "Đang xét";
        };
    }

    private ModeratorEvidenceResponse mapToModeratorEvidenceResponse(DisputeEvidence ev) {
        if (ev == null) return null;
        String fileUrl = ev.getFileUrl();
        if (StringUtils.hasText(ev.getStorageObjectKey())) {
            try {
                fileUrl = storageService.createDisputeDownloadUrl(ev.getStorageObjectKey());
            } catch (Exception ex) {
                log.debug("Could not presign URL for dispute evidence {}: {}", ev.getId(), ex.getMessage());
            }
        }

        return ModeratorEvidenceResponse.builder()
                .id("disp-ev-" + ev.getId())
                .rawId(ev.getId())
                .name(ev.getFileName() != null ? ev.getFileName() : "tai-lieu-" + ev.getId())
                .type(determineEvidenceType(ev))
                .url(fileUrl)
                .build();
    }

    private String determineEvidenceType(DisputeEvidence ev) {
        String fileName = ev.getFileName() != null ? ev.getFileName().toLowerCase(Locale.ROOT) : "";
        String contentType = ev.getContentType() != null ? ev.getContentType().toLowerCase(Locale.ROOT) : "";
        if (fileName.endsWith(".pdf") || contentType.contains("pdf")) {
            return "pdf";
        }
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png")
                || fileName.endsWith(".webp") || contentType.startsWith("image/")) {
            return "image";
        }
        if (fileName.endsWith(".mp4") || fileName.endsWith(".mov") || contentType.startsWith("video/")) {
            return "video";
        }
        return "document";
    }

    private void recordAuditLog(User actor, String action, Long entityId, String previousValue, String newValue, String reason) {
        AuditLog auditLog = AuditLog.builder()
                .actorUser(actor)
                .action(action)
                .entityType("DISPUTE")
                .entityId(entityId)
                .previousValue(previousValue)
                .newValue(newValue)
                .reason(reason)
                .createdAt(LocalDateTime.now(VIETNAM_ZONE))
                .build();
        auditLogRepository.save(auditLog);
    }
}
