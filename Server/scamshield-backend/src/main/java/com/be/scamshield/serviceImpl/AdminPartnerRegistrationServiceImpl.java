package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;
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
import com.be.scamshield.external.PartnerDocumentStorageService;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import com.be.scamshield.service.AdminPartnerRegistrationService;
import com.be.scamshield.service.PartnerPasswordSetupService;
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
    private final PartnerPasswordSetupService passwordSetupService;
    private final PartnerDocumentStorageService documentStorage;

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
        String downloadUrl = document.getStorageObjectKey() == null ? null
                : documentStorage.createDownloadUrl(document.getStorageObjectKey(), document.getFileName());
        String contentBase64 = document.getContent() == null ? null
                : Base64.getEncoder().encodeToString(document.getContent());
        return new PartnerDocumentContentResponse(document.getId(), document.getFileName(),
                document.getContentType(), document.getFileSize(), downloadUrl, contentBase64);
    }

    @Transactional
    @Override
    public AdminPartnerRegistrationDetailResponse review(Long id, AdminPartnerReviewRequest request, Long reviewerId) {
        PartnerVerificationStatus decision = request.getVerificationStatus();
        if (decision != PartnerVerificationStatus.VERIFIED && decision != PartnerVerificationStatus.REJECTED) {
            throw new BadRequestException("Chỉ có thể phê duyệt hoặc từ chối hồ sơ");
        }
        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isBlank()) {
            throw new BadRequestException(decision == PartnerVerificationStatus.VERIFIED
                    ? "Cần nhập lý do phê duyệt hồ sơ" : "Cần nhập lý do từ chối hồ sơ");
        }
        User reviewer = users.findById(reviewerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản quản trị"));
        PartnerProfile profile = profiles.findByIdForReview(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đối tác"));
        if (profile.getVerificationStatus() != PartnerVerificationStatus.PENDING) {
            throw new PartnerReviewConflictException("Hồ sơ đã được xét duyệt; hãy tải lại trạng thái mới nhất");
        }
        if (decision == PartnerVerificationStatus.VERIFIED &&
                (("PENDING_OCR".equals(profile.getDocumentVerificationStatus())
                        || "RUNNING_OCR".equals(profile.getDocumentVerificationStatus()))
                        || documents.existsByPartnerIdAndStorageStatusNot(id, "READY"))) {
            throw new PartnerReviewConflictException("Tài liệu hoặc đối soát OCR chưa hoàn tất; chưa thể phê duyệt");
        }
        LocalDateTime now = LocalDateTime.now(applicationClock);
        if (decision == PartnerVerificationStatus.VERIFIED) {
            createEntry(profile, IndicatorType.URL, profile.getOfficialDomain(), now, reviewer);
            createEntry(profile, IndicatorType.PHONE, normalizeHotline(profile.getOfficialHotline()), now, reviewer);
            profile.getUser().setStatus(UserStatus.ACTIVE.name());
        } else {
            profile.getUser().setStatus(UserStatus.INACTIVE.name());
        }
        profile.setVerificationStatus(decision);
        profile.setVerificationReason(reason);
        if (decision == PartnerVerificationStatus.VERIFIED) {
            passwordSetupService.issue(id);
        }
        profile.setVerifiedByUser(reviewer);
        profile.setVerifiedAt(now);
        profile.setUpdatedAt(now);
        auditLogs.save(AuditLog.builder().actorUser(reviewer).action("REVIEW_PARTNER_REGISTRATION")
                .entityType("PARTNER_PROFILE").entityId(id).previousValue("PENDING")
                .newValue(decision.name()).reason(reason)
                .createdAt(now).build());
        return detail(profile);
    }

    private void createEntry(PartnerProfile profile, IndicatorType type, String value, LocalDateTime now, User reviewer) {
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

    @Transactional
    public AdminPartnerRegistrationDetailResponse resendPasswordLink(Long id) {
        passwordSetupService.issue(id);
        return detail(id);
    }

    private AdminPartnerRegistrationItemResponse item(PartnerProfile profile) {
        return new AdminPartnerRegistrationItemResponse(profile.getId(), profile.getLegalName(), profile.getTaxCode(),
                profile.getCorporateEmail(), profile.getRepresentativeNameAndTitle(), profile.getOfficialDomain(),
                profile.getOfficialHotline(), profile.getSmsBrandName(), profile.getVerificationStatus(),
                profile.getCreatedAt(), profile.getVerifiedAt());
    }

    private AdminPartnerRegistrationDetailResponse detail(PartnerProfile profile) {
        String reason = profile.getVerificationReason();
        if (reason == null && profile.getVerificationStatus() == PartnerVerificationStatus.REJECTED) {
            reason = auditLogs.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PARTNER_PROFILE", profile.getId())
                    .stream().filter(log -> "REVIEW_PARTNER_REGISTRATION".equals(log.getAction()))
                    .map(AuditLog::getReason).findFirst().orElse(null);
        }
        PartnerBusinessVerificationResponse verification = null;
        if (StringUtils.hasText(profile.getBusinessVerificationResult())) {
            verification = objectMapper.readValue(profile.getBusinessVerificationResult(),
                    PartnerBusinessVerificationResponse.class);
        }
        var metadata = documents.findMetadataByPartnerId(profile.getId());
        var documentGroups = List.of("BUSINESS_LICENSE", "OWNERSHIP_PROOF", "AUTHORIZATION").stream()
                .map(type -> new AdminPartnerRegistrationDetailResponse.DocumentGroup(type,
                        metadata.stream().filter(document -> type.equals(document.documentType())).toList()))
                .toList();
        return new AdminPartnerRegistrationDetailResponse(profile.getId(), profile.getUser().getId(),
                profile.getLegalName(), profile.getTaxCode(), profile.getCorporateEmail(),
                profile.getRepresentativeNameAndTitle(), profile.getLegalRepresentative(), profile.getContactPhone(),
                profile.getOfficialDomain(), profile.getOfficialHotline(), profile.getSmsBrandName(),
                profile.getVerificationStatus(), profile.getCreatedAt(), profile.getVerifiedAt(),
                profile.getVerifiedByUser() == null ? null : profile.getVerifiedByUser().getFullName(), reason,
                profile.getPasswordLinkEmailStatus(), profile.getPasswordSetupCompletedAt(),
                verification, profile.getDocumentVerificationStatus(), documentGroups);
    }
}
