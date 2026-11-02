package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;

import com.be.scamshield.constant.EvidenceVerificationStatus;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.DisputeListRequest;
import com.be.scamshield.dto.response.DisputeListItemResponse;
import com.be.scamshield.dto.response.DisputeListItemResponse.Attachment;
import com.be.scamshield.dto.response.DisputeListItemResponse.IndicatorSummary;
import com.be.scamshield.dto.response.DisputeSummaryResponse;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Dispute;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.repository.DisputeEvidenceRepository;
import com.be.scamshield.repository.DisputeRepository;
import com.be.scamshield.service.IDisputeService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class DisputeServiceImpl implements IDisputeService {
    private static final String TIMEZONE = "Asia/Ho_Chi_Minh";
    private static final List<DisputeStatus> RESOLVED_STATUSES = List.of(DisputeStatus.APPROVED, DisputeStatus.REJECTED);
    private final DisputeRepository disputeRepository;
    private final DisputeEvidenceRepository evidenceRepository;
    private final Clock clock;
    private final SupabaseStorageService storageService;

    @Override
    public PaginatedResponse<DisputeListItemResponse> getMyDisputes(Long userId, DisputeListRequest filter) {
        requireUser(userId);
        var page = disputeRepository.findAll(myDisputes(userId, filter), PageRequest.of(filter.getPage(), filter.getSize(),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))));
        Map<Long, List<Attachment>> files = new HashMap<>();
        if (!page.isEmpty()) {
            var ids = page.stream().map(Dispute::getId).toList();
            for (var file : evidenceRepository.findFilesForDisputes(ids)) {
                files.computeIfAbsent(file.getDisputeId(), key -> new ArrayList<>()).add(new Attachment(file.getId(),
                        file.getEvidenceType(), file.getFileName(), file.getStorageObjectKey() == null || file.getStorageObjectKey().isBlank() ? file.getFileUrl()
                                : storageService.createDisputeDownloadUrl(file.getStorageObjectKey()),
                        file.getFileSize(), file.getContentType(), file.getDescription(),
                        EvidenceVerificationStatus.fromStoredValue(file.getVerificationStatus()), file.getCreatedAt()));
            }
        }
        return PaginatedResponse.buildPaginatedResponse(page.map(d -> toResponse(d, files.getOrDefault(d.getId(), List.of()))));
    }

    @Override
    public DisputeSummaryResponse getMySummary(Long userId) {
        requireUser(userId);
        LocalDateTime now = LocalDateTime.now(clock.withZone(ZoneId.of(TIMEZONE)));
        Map<DisputeStatus, Long> counts = new EnumMap<>(DisputeStatus.class);
        disputeRepository.countStatuses(userId).forEach(c -> counts.put(c.getStatus(), c.getTotal()));
        long pending = counts.getOrDefault(DisputeStatus.PENDING, 0L);
        long inReview = counts.getOrDefault(DisputeStatus.IN_REVIEW, 0L);
        long needsMoreInfo = counts.getOrDefault(DisputeStatus.NEEDS_MORE_INFO, 0L);
        long approved = counts.getOrDefault(DisputeStatus.APPROVED, 0L);
        long rejected = counts.getOrDefault(DisputeStatus.REJECTED, 0L);
        long completedCount = approved + rejected;
        Double seconds = disputeRepository.averageResolutionSeconds(userId, RESOLVED_STATUSES, now);
        BigDecimal averageHours = seconds == null ? null : BigDecimal.valueOf(seconds).divide(BigDecimal.valueOf(3600), 1, RoundingMode.HALF_UP);
        BigDecimal restorationRate = completedCount == 0 ? null
                : BigDecimal.valueOf(approved).multiply(BigDecimal.valueOf(100)).divide(BigDecimal.valueOf(completedCount), 1, RoundingMode.HALF_UP);
        return new DisputeSummaryResponse(TIMEZONE, now, pending + inReview + needsMoreInfo + completedCount, pending, inReview, needsMoreInfo,
                approved, rejected, averageHours, restorationRate);
    }

    private Specification<Dispute> myDisputes(Long userId, DisputeListRequest filter) {
        if (filter.getStatus() != null && filter.getStatus().contains(DisputeStatus.DRAFT)) {
            throw new BadRequestException("Dùng API /api/disputes/drafts để xem hồ sơ nháp");
        }
        return (root, query, cb) -> {
            List<Predicate> conditions = new ArrayList<>();
            conditions.add(cb.equal(root.get("submittedByUser").get("id"), userId));
            conditions.add(cb.notEqual(root.get("status"), DisputeStatus.DRAFT));
            if (filter.getStatus() != null && !filter.getStatus().isEmpty()) conditions.add(root.get("status").in(filter.getStatus()));
            return cb.and(conditions.toArray(Predicate[]::new));
        };
    }

    private DisputeListItemResponse toResponse(Dispute dispute, List<Attachment> files) {
        ConfirmedIndicator confirmed = dispute.getConfirmedIndicator();
        Indicator indicator = confirmed.getIndicator();
        String value = indicator.getDisplayValue() == null || indicator.getDisplayValue().isBlank()
                ? indicator.getNormalizedValue() : indicator.getDisplayValue();
        return new DisputeListItemResponse(dispute.getId(), "DSP-" + dispute.getId(), dispute.getStatus(), dispute.getPriority(),
                dispute.getReason(), dispute.getLegalRelationship(), dispute.getDeclarationAcceptedAt(),
                dispute.getProgressMessage(), dispute.getEstimatedResolutionAt(), dispute.getSupplementReason(),
                dispute.getSupplementDeadline(), dispute.getResolutionReason(), dispute.getResolutionDocumentUrl(), dispute.getCreatedAt(),
                dispute.getUpdatedAt(), dispute.getResolvedAt(), new IndicatorSummary(indicator.getId(), indicator.getType(), value,
                confirmed.getStatus(), confirmed.getRetractedAt()), files.size(), List.copyOf(files));
    }

    private void requireUser(Long userId) {
        if (userId == null || userId <= 0) throw new UnauthorizedException("Vui lòng đăng nhập để xem khiếu nại của bạn");
    }
}
