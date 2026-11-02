package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.UserStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationCountsResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationDetailResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationItemResponse;
import com.be.scamshield.dto.admin.PartnerDocumentContentResponse;
import com.be.scamshield.dto.request.AdminPartnerReviewRequest;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.PartnerReviewConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import com.be.scamshield.service.AdminPartnerRegistrationService;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminPartnerRegistrationServiceImpl implements AdminPartnerRegistrationService {
    private final PartnerProfileRepository profiles;
    private final PartnerDocumentRepository documents;
    private final UserRepository users;
    private final IndicatorRepository indicators;
    private final WhitelistEntryRepository whitelistEntries;
    private final AuditLogRepository auditLogs;
    private final ObjectMapper objectMapper;
    private final Clock applicationClock;

    @Override
    public PaginatedResponse<AdminPartnerRegistrationItemResponse> list(String search,
            PartnerVerificationStatus status, int page, int size) {
        String keyword = StringUtils.hasText(search)
                ? "%" + search.trim().toLowerCase(Locale.ROOT).replace("\\", "\\\\")
                        .replace("%", "\\%").replace("_", "\\_") + "%" : null;
        Page<AdminPartnerRegistrationItemResponse> result = profiles.findForAdmin(status, keyword,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"))).map(this::item);
        return PaginatedResponse.buildPaginatedResponse(result);
    }

    @Override
    public AdminPartnerRegistrationCountsResponse counts() {
        return new AdminPartnerRegistrationCountsResponse(
                profiles.countByVerificationStatus(PartnerVerificationStatus.PENDING),
                profiles.countByVerificationStatus(PartnerVerificationStatus.VERIFIED),
                profiles.countByVerificationStatus(PartnerVerificationStatus.REJECTED));
    }

    @Override
    public AdminPartnerRegistrationDetailResponse detail(Long id) {
        PartnerProfile profile = profiles.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đối tác"));
        return detail(profile);
    }

    @Override
    public PartnerDocumentContentResponse document(Long partnerId, Long documentId) {
        if (!profiles.existsById(partnerId)) {
            throw new ResourceNotFoundException("Không tìm thấy hồ sơ đối tác");
        }
        PartnerDocument document = documents.findByIdAndPartnerId(documentId, partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu của hồ sơ này"));
        return new PartnerDocumentContentResponse(document.getId(), document.getFileName(),
                document.getContentType(), document.getFileSize(),
                Base64.getEncoder().encodeToString(document.getContent()));
    }

    @Transactional
    @Override
    public AdminPartnerRegistrationDetailResponse review(Long id, AdminPartnerReviewRequest request, Long reviewerId) {
        PartnerVerificationStatus decision = request.getVerificationStatus();
        if (decision != PartnerVerificationStatus.VERIFIED && decision != PartnerVerificationStatus.REJECTED) {
            throw new BadRequestException("Chỉ có thể phê duyệt hoặc từ chối hồ sơ");
        }
        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (decision == PartnerVerificationStatus.REJECTED && reason.isBlank()) {
            throw new BadRequestException("Cần nhập lý do từ chối hồ sơ");
        }
        User reviewer = users.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản quản trị"));
        PartnerProfile profile = profiles.findByIdForReview(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đối tác"));
        if (profile.getVerificationStatus() != PartnerVerificationStatus.PENDING) {
            throw new PartnerReviewConflictException("Hồ sơ đã được xét duyệt; hãy tải lại trạng thái mới nhất");
        }
        LocalDateTime now = LocalDateTime.now(applicationClock);
        if (decision == PartnerVerificationStatus.VERIFIED) {
            createEntry(profile, "DOMAIN", profile.getOfficialDomain(), now, reviewer);
            createEntry(profile, "PHONE", normalizeHotline(profile.getOfficialHotline()), now, reviewer);
            createEntry(profile, "SMS_BRAND_NAME", profile.getSmsBrandName(), now, reviewer);
            profile.getUser().setStatus(UserStatus.ACTIVE.name());
        } else {
            profile.getUser().setStatus(UserStatus.INACTIVE.name());
        }
        profile.setVerificationStatus(decision);
        profile.setVerifiedByUser(reviewer);
        profile.setVerifiedAt(now);
        profile.setUpdatedAt(now);
        auditLogs.save(AuditLog.builder().actorUser(reviewer).action("REVIEW_PARTNER_REGISTRATION")
                .entityType("PARTNER_PROFILE").entityId(id).previousValue("PENDING")
                .newValue(decision.name()).reason(reason.isBlank() ? "Đã phê duyệt hồ sơ đối tác" : reason)
                .createdAt(now).build());
        return detail(profile);
    }

    private void createEntry(PartnerProfile profile, String type, String value, LocalDateTime now, User reviewer) {
        if (!StringUtils.hasText(value)) {
            throw new PartnerReviewConflictException("Hồ sơ thiếu chỉ số chính thức; không thể phê duyệt");
        }
        indicators.lockIdentifier(type + ":" + value);
        Indicator indicator = indicators.findByTypeAndNormalizedValue(type, value).orElseGet(() ->
                indicators.save(Indicator.builder().type(type).normalizedValue(value).displayValue(value)
                        .firstSeenAt(now).lastSeenAt(now).createdAt(now).updatedAt(now).build()));
        if (whitelistEntries.existsByIndicatorIdAndVerificationStatusAndPartnerIdNot(
                indicator.getId(), "VERIFIED", profile.getId())) {
            throw new PartnerReviewConflictException("Chỉ số " + value + " đã được xác minh cho đối tác khác");
        }
        WhitelistEntry entry = whitelistEntries.findByIndicatorIdAndPartnerId(indicator.getId(), profile.getId())
                .orElseGet(() -> WhitelistEntry.builder().partner(profile).indicator(indicator)
                        .autoLockModeration(false).createdAt(now).build());
        entry.setVerificationStatus("VERIFIED");
        entry.setVerifiedByUser(reviewer);
        entry.setVerifiedAt(now);
        entry.setUpdatedAt(now);
        whitelistEntries.save(entry);
    }

    private String normalizeHotline(String value) {
        if (value == null) return null;
        String normalized = value.replaceAll("[\\s().-]", "");
        return normalized.startsWith("+84") ? "0" + normalized.substring(3) : normalized;
    }

    private AdminPartnerRegistrationItemResponse item(PartnerProfile profile) {
        return new AdminPartnerRegistrationItemResponse(profile.getId(), profile.getLegalName(), profile.getTaxCode(),
                profile.getCorporateEmail(), profile.getRepresentativeNameAndTitle(), profile.getOfficialDomain(),
                profile.getOfficialHotline(), profile.getSmsBrandName(), profile.getVerificationStatus(),
                profile.getCreatedAt(), profile.getVerifiedAt());
    }

    private AdminPartnerRegistrationDetailResponse detail(PartnerProfile profile) {
        String reason = auditLogs.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PARTNER_PROFILE", profile.getId())
                .stream().filter(log -> "REVIEW_PARTNER_REGISTRATION".equals(log.getAction()))
                .map(AuditLog::getReason).findFirst().orElse(null);
        PartnerBusinessVerificationResponse verification = null;
        if (StringUtils.hasText(profile.getBusinessVerificationResult())) {
            verification = objectMapper.readValue(profile.getBusinessVerificationResult(),
                    PartnerBusinessVerificationResponse.class);
        }
        return new AdminPartnerRegistrationDetailResponse(profile.getId(), profile.getUser().getId(),
                profile.getLegalName(), profile.getTaxCode(), profile.getCorporateEmail(),
                profile.getRepresentativeNameAndTitle(), profile.getContactPhone(), profile.getLegalRepresentative(),
                profile.getOfficialDomain(), profile.getOfficialHotline(), profile.getSmsBrandName(),
                profile.getVerificationStatus(), profile.getCreatedAt(), profile.getVerifiedAt(),
                profile.getVerifiedByUser() == null ? null : profile.getVerifiedByUser().getFullName(), reason,
                verification, documents.findMetadataByPartnerId(profile.getId()));
    }
}
