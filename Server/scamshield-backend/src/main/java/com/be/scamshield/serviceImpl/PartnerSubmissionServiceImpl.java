package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.NotificationType;
import com.be.scamshield.constant.ConfirmedIndicatorStatus;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionCountsResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionFilterRequest;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.ReviewPartnerSubmissionRequest;
import com.be.scamshield.dto.partner.SubmitPartnerAlertRequest;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Notification;
import com.be.scamshield.entity.OfficialScamWarning;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.PartnerOfficialAlert;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.PartnerSubmissionConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.NotificationRepository;
import com.be.scamshield.repository.OfficialScamWarningRepository;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerOfficialAlertRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.ScamCategorieRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerSubmissionService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.IDN;
import java.net.URI;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerSubmissionServiceImpl implements IPartnerSubmissionService {

    private static final Pattern TARGET_HEADER_PATTERN =
            Pattern.compile("^\\[Target:\\s*([A-Za-z_-]+):([^|\\]]+)(?:\\s*\\|\\s*Category:\\s*([A-Za-z0-9_-]+))?\\]\\s*\\n?([\\s\\S]*)");

    private final PartnerOfficialAlertRepository partnerOfficialAlertRepository;
    private final PartnerProfileRepository partnerProfileRepository;
    private final PartnerDocumentRepository partnerDocumentRepository;
    private final UserRepository userRepository;
    private final IndicatorRepository indicatorRepository;
    private final ConfirmedIndicatorRepository confirmedIndicatorRepository;
    private final ScamCategorieRepository scamCategorieRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final OfficialScamWarningRepository officialScamWarningRepository;
    private final SupabaseStorageService supabaseStorageService;
    private final WhitelistEntryRepository whitelistEntryRepository;
    private final Clock applicationClock;

    @Override
    @Transactional
    public PartnerSubmissionResponse submitAlertOrIntel(
            SubmitPartnerAlertRequest request,
            MultipartFile file,
            UserPrincipal currentUser) {

        PartnerProfile partnerProfile = resolveActivePartnerProfile(currentUser);
        LocalDateTime now = LocalDateTime.now(applicationClock);

        // Pre-moderation Gate: Format Validation & Whitelist Collision Check
        validateIndicatorAndCheckWhitelist(
                request.getIndicatorType(),
                request.getIndicatorValue(),
                partnerProfile,
                now
        );

        // Also inspect description for any embedded whitelisted domains/URLs
        if (StringUtils.hasText(request.getDescription())) {
            checkDescriptionForWhitelistedUrls(request.getDescription(), partnerProfile, now);
        }

        Long evidenceId = null;
        if (file != null && !file.isEmpty()) {
            try {
                String safeContentType = StringUtils.hasText(file.getContentType()) ? file.getContentType() : "application/octet-stream";
                if (safeContentType.length() > 50) {
                    safeContentType = safeContentType.substring(0, 50);
                }
                String safeFileName = StringUtils.hasText(file.getOriginalFilename()) ? file.getOriginalFilename() : "evidence.bin";
                if (safeFileName.length() > 255) {
                    safeFileName = safeFileName.substring(safeFileName.length() - 255);
                }

                // 1. Tải tệp bằng chứng lên Supabase Storage bucket (S3 protocol)
                if (supabaseStorageService != null && supabaseStorageService.isStorageConfigured()) {
                    try {
                        SupabaseStorageService.UploadResult uploadResult = supabaseStorageService.uploadFile(file, "partner-evidences");
                        log.info("Partner evidence successfully uploaded to Supabase Storage: {}", uploadResult.fileUrl());
                    } catch (Exception ex) {
                        log.warn("Supabase Storage upload warning (fallback to DB): {}", ex.getMessage());
                    }
                }

                // 2. Lưu vào PostgreSQL partner_documents đảm bảo tính toàn vẹn và liên kết khóa ngoại evidence_id
                PartnerDocument doc = PartnerDocument.builder()
                        .partner(partnerProfile)
                        .documentType("THREAT_INTEL_EVIDENCE")
                        .fileName(safeFileName)
                        .contentType(safeContentType)
                        .fileSize(file.getSize())
                        .content(file.getBytes())
                        .createdAt(now)
                        .build();
                PartnerDocument savedDoc = partnerDocumentRepository.save(doc);
                evidenceId = savedDoc.getId();
            } catch (IOException e) {
                throw new BadRequestException("Không thể xử lý tệp bằng chứng đính kèm: " + e.getMessage());
            }
        }

        String submissionType = request.getSubmissionType() != null ? request.getSubmissionType().trim().toUpperCase(Locale.ROOT) : "THREAT_INTEL";
        if (!"SCAM_ALERT".equals(submissionType) && !"THREAT_INTEL".equals(submissionType) && !"OFFICIAL_ALERT".equals(submissionType)) {
            submissionType = "THREAT_INTEL";
        }

        String formattedDescription = formatDescription(
                request.getIndicatorType(),
                request.getIndicatorValue(),
                request.getCategoryCode(),
                request.getDescription()
        );

        String safeTitle = StringUtils.hasText(request.getTitle()) ? request.getTitle().trim() : "Cảnh báo đối tác";
        if (safeTitle.length() > 255) {
            safeTitle = safeTitle.substring(0, 255);
        }

        PartnerOfficialAlert alert = PartnerOfficialAlert.builder()
                .partner(partnerProfile)
                .submissionType(submissionType)
                .title(safeTitle)
                .description(formattedDescription)
                .evidenceId(evidenceId)
                .status("PENDING")
                .createdAt(now)
                .build();

        PartnerOfficialAlert saved = partnerOfficialAlertRepository.save(alert);
        log.info("Partner submitted alert/intel: id={}, type={}, partnerId={}", saved.getId(), saved.getSubmissionType(), partnerProfile.getId());

        return mapToResponse(saved, "NONE");
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<PartnerSubmissionResponse> getMySubmissions(
            String status, int page, int size, UserPrincipal currentUser) {
        PartnerProfile partnerProfile = resolveActivePartnerProfile(currentUser);
        Pageable pageable = PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<PartnerOfficialAlert> pageResult;
        if (StringUtils.hasText(status) && !"ALL".equalsIgnoreCase(status)) {
            pageResult = partnerOfficialAlertRepository.findByPartnerIdAndStatus(partnerProfile.getId(), status.toUpperCase(Locale.ROOT), pageable);
        } else {
            pageResult = partnerOfficialAlertRepository.findByPartnerId(partnerProfile.getId(), pageable);
        }

        Page<PartnerSubmissionResponse> mappedPage = pageResult.map(alert -> mapToResponse(alert, null));
        return PaginatedResponse.buildPaginatedResponse(mappedPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PartnerSubmissionResponse getMySubmissionDetail(Long id, UserPrincipal currentUser) {
        PartnerProfile partnerProfile = resolveActivePartnerProfile(currentUser);
        PartnerOfficialAlert alert = partnerOfficialAlertRepository.findByIdAndPartnerId(id, partnerProfile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ gửi của đối tác với ID: " + id));
        return mapToResponse(alert, null);
    }

    @Override
    @Transactional(readOnly = true)
    public PaginatedResponse<PartnerSubmissionResponse> getModeratorQueue(
            PartnerSubmissionFilterRequest filter, Pageable pageable) {

        Specification<PartnerOfficialAlert> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (filter != null && StringUtils.hasText(filter.getStatus()) && !"ALL".equalsIgnoreCase(filter.getStatus())) {
                predicates.add(cb.equal(cb.upper(root.get("status")), filter.getStatus().toUpperCase(Locale.ROOT)));
            }

            if (filter != null && StringUtils.hasText(filter.getSubmissionType()) && !"ALL".equalsIgnoreCase(filter.getSubmissionType())) {
                predicates.add(cb.equal(cb.upper(root.get("submissionType")), filter.getSubmissionType().toUpperCase(Locale.ROOT)));
            }

            if (filter != null && StringUtils.hasText(filter.getSearch())) {
                String searchPattern = "%" + filter.getSearch().trim().toLowerCase(Locale.ROOT) + "%";
                Predicate titlePredicate = cb.like(cb.lower(root.get("title")), searchPattern);
                Predicate descPredicate = cb.like(cb.lower(root.get("description")), searchPattern);
                Predicate partnerPredicate = cb.like(cb.lower(root.get("partner").get("brandName")), searchPattern);
                predicates.add(cb.or(titlePredicate, descPredicate, partnerPredicate));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<PartnerOfficialAlert> pageResult = partnerOfficialAlertRepository.findAll(spec, pageable);
        Page<PartnerSubmissionResponse> mappedPage = pageResult.map(alert -> mapToResponse(alert, null));
        return PaginatedResponse.buildPaginatedResponse(mappedPage);
    }

    @Override
    @Transactional(readOnly = true)
    public PartnerSubmissionCountsResponse getQueueCounts() {
        long total = partnerOfficialAlertRepository.count();
        long pending = partnerOfficialAlertRepository.countByStatus("PENDING");
        long verified = partnerOfficialAlertRepository.countByStatus("VERIFIED");
        long rejected = partnerOfficialAlertRepository.countByStatus("REJECTED");

        return PartnerSubmissionCountsResponse.builder()
                .totalCount(total)
                .pendingCount(pending)
                .verifiedCount(verified)
                .rejectedCount(rejected)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public PartnerSubmissionResponse getSubmissionDetailForModerator(Long id) {
        PartnerOfficialAlert alert = partnerOfficialAlertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ cảnh báo/tình báo với ID: " + id));
        return mapToResponse(alert, null);
    }

    @Override
    @Transactional
    public PartnerSubmissionResponse reviewSubmission(
            Long id,
            ReviewPartnerSubmissionRequest request,
            UserPrincipal currentUser) {

        User moderatorUser = resolveModeratorUser(currentUser);
        PartnerOfficialAlert submission = partnerOfficialAlertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ cảnh báo/tình báo với ID: " + id));

        if (!"PENDING".equalsIgnoreCase(submission.getStatus())) {
            throw new BadRequestException("Hồ sơ đã được thẩm định trước đó (trạng thái hiện tại: " + submission.getStatus() + ")");
        }

        LocalDateTime now = LocalDateTime.now(applicationClock);
        String reason = request.getReason() != null ? request.getReason().trim() : "";
        String indicatorAction = "NONE";

        if (request.getDecision() == ReviewPartnerSubmissionRequest.DecisionType.REJECT) {
            submission.setStatus("REJECTED");
            submission.setReviewedBy(moderatorUser);
            submission.setReviewedAt(now);

            partnerOfficialAlertRepository.save(submission);

            if (submission.getPartner() != null && submission.getPartner().getUser() != null) {
                String safeMessage = "Hồ sơ #" + submission.getId() + " (" + submission.getTitle() + ") đã bị từ chối: " + reason;
                if (safeMessage.length() > 255) {
                    safeMessage = safeMessage.substring(0, 252) + "...";
                }
                Notification notification = Notification.builder()
                        .user(submission.getPartner().getUser())
                        .type(NotificationType.SYSTEM)
                        .title("Hồ sơ cảnh báo/tình báo bị từ chối")
                        .message(safeMessage)
                        .referenceId(submission.getId())
                        .isRead(false)
                        .createdAt(now)
                        .build();
                notificationRepository.save(notification);
            }

            auditLogRepository.save(AuditLog.builder()
                    .actorUser(moderatorUser)
                    .action("REJECT_PARTNER_SUBMISSION")
                    .entityType("PARTNER_OFFICIAL_ALERT")
                    .entityId(submission.getId())
                    .previousValue("PENDING")
                    .newValue("REJECTED")
                    .reason(reason)
                    .createdAt(now)
                    .build());

        } else if (request.getDecision() == ReviewPartnerSubmissionRequest.DecisionType.VERIFY) {
            submission.setStatus("VERIFIED");
            submission.setReviewedBy(moderatorUser);
            submission.setReviewedAt(now);

            ParsedTarget target = parseTarget(submission.getDescription());

            // Flow: verified intelligence -> existing indicator updated or candidate created -> confirmed if approved
            if (StringUtils.hasText(target.indicatorType()) && StringUtils.hasText(target.indicatorValue())) {
                String rawType = target.indicatorType().toUpperCase(Locale.ROOT);
                IndicatorType type = supportedIndicatorType(rawType);
                if (type == null) throw new BadRequestException("Loại đối tượng phải là PHONE, URL hoặc BANK_ACCOUNT");
                String normalizedVal = normalizeIdentifier(type.name(), target.indicatorValue());

                // Defense-in-depth: Ensure indicator is not verified in Whitelist before confirming into Active Blacklist
                assertNotWhitelisted(type, normalizedVal, target.indicatorValue(), now);

                Optional<Indicator> existingIndicatorOpt = indicatorRepository.findByTypeAndNormalizedValue(type, normalizedVal);


                Indicator indicator;

                if (existingIndicatorOpt.isPresent()) {
                    indicator = existingIndicatorOpt.get();
                    indicator.setLastSeenAt(now);
                    indicator.setUpdatedAt(now);
                    indicator = indicatorRepository.save(indicator);
                    indicatorAction = "EXISTING_UPDATED";
                    log.info("Verified intelligence: existing indicator updated id={}", indicator.getId());
                } else {
                    indicator = Indicator.builder()
                            .type(type)
                            .normalizedValue(normalizedVal)
                            .displayValue(target.indicatorValue())
                            .firstSeenAt(now)
                            .lastSeenAt(now)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
                    indicator = indicatorRepository.save(indicator);
                    indicatorAction = "CANDIDATE_CREATED";
                    log.info("Verified intelligence: candidate indicator created id={}", indicator.getId());
                }

                // Đưa chỉ số vào ConfirmedIndicator (Active Blacklist)
                Optional<ConfirmedIndicator> existingConfirmedOpt = confirmedIndicatorRepository.findByIndicatorId(indicator.getId());
                ConfirmedIndicator confirmed;

                ScamCategory category = resolveCategory(target.categoryCode());
                String publicReason = submission.getTitle();
                if (StringUtils.hasText(reason)) {
                    publicReason += " - " + reason;
                }
                if (publicReason.length() > 255) {
                    publicReason = publicReason.substring(0, 255);
                }

                if (existingConfirmedOpt.isPresent()) {
                    confirmed = existingConfirmedOpt.get();
                    confirmed.setStatus(ConfirmedIndicatorStatus.ACTIVE);
                    confirmed.setRetractedAt(null);
                    confirmed.setRetractionReason(null);
                    confirmed.setConfirmedAt(now);
                    confirmed.setConfirmedByUser(moderatorUser);
                    if (category != null) {
                        confirmed.setCategory(category);
                    }
                    confirmed.setImpersonatedPartner(submission.getPartner());
                    confirmed.setPublicReason(publicReason);
                    confirmed = confirmedIndicatorRepository.save(confirmed);
                } else {
                    confirmed = ConfirmedIndicator.builder()
                            .indicator(indicator)
                            .category(category)
                            .impersonatedPartner(submission.getPartner())
                            .status(ConfirmedIndicatorStatus.ACTIVE)
                            .confirmedByUser(moderatorUser)
                            .confirmedAt(now)
                            .publicReason(publicReason)
                            .build();
                    confirmed = confirmedIndicatorRepository.save(confirmed);
                }

                // Ghi audit log xác nhận chỉ số lừa đảo
                auditLogRepository.save(AuditLog.builder()
                        .actorUser(moderatorUser)
                        .action("CONFIRM_INDICATOR_FROM_PARTNER_INTEL")
                        .entityType("CONFIRMED_INDICATOR")
                        .entityId(confirmed.getId())
                        .newValue("ACTIVE")
                        .reason("Xác nhận chỉ số lừa đảo từ nguồn tin tình báo của đối tác: " + (submission.getPartner() != null ? submission.getPartner().getBrandName() : "Đối tác"))
                        .createdAt(now)
                        .build());
            }

            // Nếu là cảnh báo chính thức (SCAM_ALERT hoặc OFFICIAL_ALERT), tạo cảnh báo cộng đồng
            if ("SCAM_ALERT".equalsIgnoreCase(submission.getSubmissionType()) || "OFFICIAL_ALERT".equalsIgnoreCase(submission.getSubmissionType())) {
                String safeTitle = submission.getTitle();
                if (safeTitle != null && safeTitle.length() > 255) {
                    safeTitle = safeTitle.substring(0, 255);
                }
                String safeContent = StringUtils.hasText(target.cleanDescription()) ? target.cleanDescription() : submission.getTitle();
                if (safeContent != null && safeContent.length() > 255) {
                    safeContent = safeContent.substring(0, 255);
                }

                OfficialScamWarning warning = OfficialScamWarning.builder()
                        .title(safeTitle)
                        .content(safeContent)
                        .category(resolveCategory(target.categoryCode()))
                        .regionCode("VN")
                        .sourceOrganization(submission.getPartner() != null ? submission.getPartner().getBrandName() : "ScamShield Partner")
                        .sourceUrl(submission.getPartner() != null ? submission.getPartner().getOfficialDomain() : null)
                        .publishedByUser(moderatorUser)
                        .publishedAt(now)
                        .status("PUBLISHED")
                        .createdAt(now)
                        .build();
                officialScamWarningRepository.save(warning);
            }

            partnerOfficialAlertRepository.save(submission);

            if (submission.getPartner() != null && submission.getPartner().getUser() != null) {
                String safeMessage = "Hồ sơ #" + submission.getId() + " (" + submission.getTitle() + ") đã được xác thực và đưa vào cơ sở dữ liệu phòng thủ ScamShield.";
                if (safeMessage.length() > 255) {
                    safeMessage = safeMessage.substring(0, 252) + "...";
                }
                Notification notification = Notification.builder()
                        .user(submission.getPartner().getUser())
                        .type(NotificationType.SYSTEM)
                        .title("Hồ sơ cảnh báo/tình báo đã được xác thực")
                        .message(safeMessage)
                        .referenceId(submission.getId())
                        .isRead(false)
                        .createdAt(now)
                        .build();
                notificationRepository.save(notification);
            }

            auditLogRepository.save(AuditLog.builder()
                    .actorUser(moderatorUser)
                    .action("VERIFY_PARTNER_SUBMISSION")
                    .entityType("PARTNER_OFFICIAL_ALERT")
                    .entityId(submission.getId())
                    .previousValue("PENDING")
                    .newValue("VERIFIED")
                    .reason(reason)
                    .createdAt(now)
                    .build());
        }

        return mapToResponse(submission, indicatorAction);
    }

    @Override
    @Transactional(readOnly = true)
    public PartnerDocument getSubmissionEvidence(Long id, UserPrincipal currentUser) {
        PartnerProfile partnerProfile = resolveActivePartnerProfile(currentUser);
        PartnerOfficialAlert alert = partnerOfficialAlertRepository.findByIdAndPartnerId(id, partnerProfile.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ với ID: " + id));

        if (alert.getEvidenceId() == null) {
            throw new ResourceNotFoundException("Hồ sơ này không đính kèm tệp bằng chứng");
        }

        return partnerDocumentRepository.findById(alert.getEvidenceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tệp bằng chứng trong hệ thống"));
    }

    @Override
    @Transactional(readOnly = true)
    public PartnerDocument getSubmissionEvidenceForModerator(Long id) {
        PartnerOfficialAlert alert = partnerOfficialAlertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ với ID: " + id));

        if (alert.getEvidenceId() == null) {
            throw new ResourceNotFoundException("Hồ sơ này không đính kèm tệp bằng chứng");
        }

        return partnerDocumentRepository.findById(alert.getEvidenceId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tệp bằng chứng trong hệ thống"));
    }

    private PartnerProfile resolveActivePartnerProfile(UserPrincipal currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện chức năng này.");
        }
        PartnerProfile profile = partnerProfileRepository.findByUserId(currentUser.getId())
                .orElseThrow(() -> new BadRequestException("Tài khoản chưa được liên kết với hồ sơ đối tác doanh nghiệp."));

        if (profile.getVerificationStatus() != PartnerVerificationStatus.VERIFIED) {
            throw new BadRequestException("Hồ sơ đối tác của bạn chưa được quản trị viên xác thực (trạng thái: " + profile.getVerificationStatus() + ").");
        }
        return profile;
    }

    private User resolveModeratorUser(UserPrincipal currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thẩm định.");
        }
        return userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản kiểm duyệt viên với ID: " + currentUser.getId()));
    }

    private void validateIndicatorAndCheckWhitelist(
            String indicatorType,
            String indicatorValue,
            PartnerProfile currentPartner,
            LocalDateTime now) {

        if (!StringUtils.hasText(indicatorValue)) {
            return;
        }

        if (!StringUtils.hasText(indicatorType)) {
            throw new BadRequestException("Vui lòng chỉ định loại chỉ báo (PHONE, URL hoặc BANK_ACCOUNT) cho giá trị: " + indicatorValue);
        }

        IndicatorType type = supportedIndicatorType(indicatorType);
        if (type == null) {
            throw new BadRequestException("Loại đối tượng phải là PHONE, URL hoặc BANK_ACCOUNT");
        }

        String[] tokens = indicatorValue.split("[,;\\s]+");
        for (String token : tokens) {
            if (!StringUtils.hasText(token)) continue;
            String trimmedToken = token.trim();

            List<String> candidateLookupValues = new ArrayList<>();

            if (type == IndicatorType.PHONE) {
                String trimmed = trimmedToken;
                boolean isBrandnameText = trimmed.matches("^[A-Za-z0-9_.-]{3,30}$") && !trimmed.matches("^[0-9+].*");
                if (isBrandnameText) {
                    candidateLookupValues.add(trimmed);
                    candidateLookupValues.add(trimmed.toLowerCase(Locale.ROOT));
                    candidateLookupValues.add(trimmed.toUpperCase(Locale.ROOT));
                } else {
                    String digitsOnly = trimmed.replaceAll("[\\s().-]", "");
                    String normalizedPhone = digitsOnly;
                    if (digitsOnly.startsWith("+84")) {
                        normalizedPhone = "0" + digitsOnly.substring(3);
                    } else if (digitsOnly.startsWith("84") && digitsOnly.length() >= 11) {
                        normalizedPhone = "0" + digitsOnly.substring(2);
                    }

                    if (!normalizedPhone.matches("^(?:0[0-9]{8,10}|1[89]00[0-9]{4,7})$")) {
                        throw new BadRequestException("Số điện thoại không đúng định dạng hợp lệ (10 chữ số di động, tổng đài 1800/1900 hoặc tên Brandname): " + trimmedToken);
                    }

                    candidateLookupValues.add(normalizedPhone);
                    candidateLookupValues.add(trimmedToken);
                    if (normalizedPhone.startsWith("0")) {
                        candidateLookupValues.add("+84" + normalizedPhone.substring(1));
                        candidateLookupValues.add("84" + normalizedPhone.substring(1));
                    }
                }
            } else if (type == IndicatorType.URL) {
                String urlToTest = trimmedToken.contains("://") ? trimmedToken : "https://" + trimmedToken;
                URI uri;
                try {
                    uri = URI.create(urlToTest);
                } catch (Exception e) {
                    throw new BadRequestException("Đường dẫn hoặc tên miền không đúng định dạng URL hợp lệ: " + trimmedToken);
                }

                String authority = uri.getRawAuthority();
                if (authority == null || uri.getRawUserInfo() != null
                        || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                    throw new BadRequestException("Đường dẫn hoặc tên miền không đúng định dạng URL hợp lệ (chỉ hỗ trợ giao thức HTTP/HTTPS): " + trimmedToken);
                }

                int colon = authority.lastIndexOf(':');
                int port = colon < 0 ? -1 : parsePort(authority.substring(colon + 1));
                String host;
                try {
                    host = IDN.toASCII(colon < 0 ? authority : authority.substring(0, colon), IDN.USE_STD3_ASCII_RULES)
                            .toLowerCase(Locale.ROOT).replaceAll("\\.$", "");
                } catch (Exception e) {
                    throw new BadRequestException("Tên miền chứa ký tự không hợp lệ: " + trimmedToken);
                }

                if (host.length() > 253 || !host.contains(".") || port > 65535 || port < -1) {
                    throw new BadRequestException("Tên miền không đúng định dạng hợp lệ: " + trimmedToken);
                }

                int lastDot = host.lastIndexOf('.');
                String tld = host.substring(lastDot + 1);
                boolean isIpv4 = host.matches("^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$");
                if (!isIpv4 && (tld.isEmpty() || tld.matches(".*\\d.*") || tld.length() < 2)) {
                    throw new BadRequestException("Tên miền không đúng định dạng hợp lệ (phần mở rộng tên miền không hợp lệ): " + trimmedToken);
                }

                String path = uri.getRawPath() == null ? "" : uri.getRawPath();
                if ("/".equals(path) && uri.getRawQuery() == null) path = "";
                String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
                boolean defaultPort = port == -1 || (port == 80 && "http".equals(scheme))
                        || (port == 443 && "https".equals(scheme));
                String key = host + (defaultPort ? "" : ":" + port) + path
                        + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());

                candidateLookupValues.add(key);
                candidateLookupValues.add(host);
                candidateLookupValues.add("https://" + host);
                candidateLookupValues.add("http://" + host);
                candidateLookupValues.add(host + "/");
                candidateLookupValues.add(trimmedToken.toLowerCase(Locale.ROOT));

                if (host.startsWith("www.")) {
                    candidateLookupValues.add(host.substring(4));
                } else {
                    candidateLookupValues.add("www." + host);
                }
            } else if (type == IndicatorType.BANK_ACCOUNT) {
                String normalizedAccount = trimmedToken.replaceAll("[\\s.-]", "");
                if (!normalizedAccount.matches("^[0-9]{6,30}$")) {
                    throw new BadRequestException("Số tài khoản ngân hàng phải có từ 6 đến 30 chữ số: " + trimmedToken);
                }
                candidateLookupValues.add(normalizedAccount);
                candidateLookupValues.add(trimmedToken);
            }

            if (!candidateLookupValues.isEmpty()) {
                // 1. Check in whitelist_entries
                List<Indicator> matchedIndicators = indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(type, candidateLookupValues);
                if (!matchedIndicators.isEmpty()) {
                    List<Long> indicatorIds = matchedIndicators.stream().map(Indicator::getId).toList();
                    List<WhitelistEntry> verifiedWhitelists = whitelistEntryRepository.findVerifiedForCheck(
                            indicatorIds, PartnerVerificationStatus.VERIFIED, now);

                    if (!verifiedWhitelists.isEmpty()) {
                        for (WhitelistEntry entry : verifiedWhitelists) {
                            if (entry.getPartner() != null) {
                                handleCollision(currentPartner, entry.getPartner(), trimmedToken);
                            }
                        }
                    }
                }

                // 2. Direct check against verified partner profiles (domain, hotline, SMS brandname)
                checkAgainstPartnerProfiles(type, candidateLookupValues, currentPartner, trimmedToken);
            }
        }
    }

    private void checkDescriptionForWhitelistedUrls(String description, PartnerProfile currentPartner, LocalDateTime now) {
        if (!StringUtils.hasText(description)) return;
        Pattern urlPattern = Pattern.compile("(?i)(?:https?://|www\\.)[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(?:/[^\\s,;\\]\\)]*)?");
        Matcher matcher = urlPattern.matcher(description);
        while (matcher.find()) {
            String extracted = matcher.group().replaceAll("[.,;:!?)\\]]+$", "");
            try {
                validateIndicatorAndCheckWhitelist("URL", extracted, currentPartner, now);
            } catch (BadRequestException ignored) {
                // Ignore general formatting errors in description prose, but conflict/collision will throw!
            }
        }
    }

    private void checkAgainstPartnerProfiles(IndicatorType type, List<String> candidateLookupValues, PartnerProfile currentPartner, String rawToken) {
        List<PartnerProfile> allProfiles = partnerProfileRepository.findAll();
        for (PartnerProfile profile : allProfiles) {
            if (profile.getVerificationStatus() != PartnerVerificationStatus.VERIFIED) {
                continue;
            }
            if (type == IndicatorType.URL && StringUtils.hasText(profile.getOfficialDomain())) {
                String offDomain = profile.getOfficialDomain().trim().toLowerCase(Locale.ROOT);
                if (offDomain.startsWith("www.")) {
                    offDomain = offDomain.substring(4);
                }
                for (String val : candidateLookupValues) {
                    String lower = val.toLowerCase(Locale.ROOT);
                    String valHost = lower;
                    if (valHost.contains("://")) {
                        valHost = valHost.substring(valHost.indexOf("://") + 3);
                    }
                    int slashIdx = valHost.indexOf('/');
                    if (slashIdx >= 0) {
                        valHost = valHost.substring(0, slashIdx);
                    }
                    int colonIdx = valHost.indexOf(':');
                    if (colonIdx >= 0) {
                        valHost = valHost.substring(0, colonIdx);
                    }
                    if (valHost.equals(offDomain) || valHost.endsWith("." + offDomain)) {
                        handleCollision(currentPartner, profile, rawToken);
                    }
                }
            } else if (type == IndicatorType.PHONE) {
                if (StringUtils.hasText(profile.getOfficialHotline())) {
                    String offHotline = profile.getOfficialHotline().replaceAll("[\\s().-]", "");
                    for (String val : candidateLookupValues) {
                        String cleanVal = val.replaceAll("[\\s().-]", "");
                        if (cleanVal.equals(offHotline) || cleanVal.equals(profile.getOfficialHotline().trim())) {
                            handleCollision(currentPartner, profile, rawToken);
                        }
                    }
                }
                if (StringUtils.hasText(profile.getSmsBrandName())) {
                    String offBrand = profile.getSmsBrandName().trim();
                    for (String val : candidateLookupValues) {
                        if (val.equalsIgnoreCase(offBrand) || val.equalsIgnoreCase(profile.getBrandName().trim())) {
                            handleCollision(currentPartner, profile, rawToken);
                        }
                    }
                }
            }
        }
    }

    private void handleCollision(PartnerProfile currentPartner, PartnerProfile matchedPartner, String indicator) {
        if (currentPartner != null && currentPartner.getId().equals(matchedPartner.getId())) {
            String brandOrLegal = currentPartner.getBrandName() != null ? currentPartner.getBrandName() : "Tổ chức của bạn";
            throw new BadRequestException("Kênh thông tin '" + indicator + "' hiện là tài nguyên số chính thức đã được bảo hộ của chính quý đơn vị ("
                    + brandOrLegal
                    + "). Để phục vụ công tác điều tra và xử lý vi phạm, quý đơn vị vui lòng chỉ cung cấp địa chỉ trang web mạo danh, đầu số lừa đảo hoặc tài khoản thụ hưởng của đối tượng gian lận.");
        } else {
            String partnerName = matchedPartner.getBrandName() != null
                    ? matchedPartner.getBrandName()
                    : matchedPartner.getLegalName();
            throw new PartnerSubmissionConflictException("Thông tin đối tượng '" + indicator
                    + "' đã được xác thực là kênh số chính thức thuộc quyền sở hữu của đối tác thành viên [" + partnerName
                    + "]. Để bảo vệ uy tín và quyền lợi hợp pháp giữa các doanh nghiệp đối tác, hệ thống không tiếp nhận cảnh báo vi phạm đối với tài nguyên chính thống này. Quý đơn vị vui lòng kiểm tra lại liên kết hoặc chỉ cung cấp trang web, đầu số giả mạo thực tế do kẻ gian phát tán.");
        }
    }

    private void assertNotWhitelisted(IndicatorType type, String normalizedVal, String displayVal, LocalDateTime now) {
        List<String> lookupValues = new ArrayList<>();
        lookupValues.add(normalizedVal);
        if (StringUtils.hasText(displayVal)) {
            lookupValues.add(displayVal.trim());
        }
        if (type == IndicatorType.URL) {
            String lower = normalizedVal.toLowerCase(Locale.ROOT);
            int slashIdx = lower.indexOf('/');
            String host = slashIdx >= 0 ? lower.substring(0, slashIdx) : lower;
            lookupValues.add(host);
            if (host.startsWith("www.")) {
                lookupValues.add(host.substring(4));
            } else {
                lookupValues.add("www." + host);
            }
        } else if (type == IndicatorType.PHONE) {
            if (normalizedVal.startsWith("0")) {
                lookupValues.add("+84" + normalizedVal.substring(1));
                lookupValues.add("84" + normalizedVal.substring(1));
            }
        }

        List<Indicator> matched = indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(type, lookupValues);
        if (!matched.isEmpty()) {
            List<Long> ids = matched.stream().map(Indicator::getId).toList();
            List<WhitelistEntry> verified = whitelistEntryRepository.findVerifiedForCheck(ids, PartnerVerificationStatus.VERIFIED, now);
            if (!verified.isEmpty()) {
                WhitelistEntry entry = verified.get(0);
                String partnerName = entry.getPartner() != null
                        ? (entry.getPartner().getBrandName() != null ? entry.getPartner().getBrandName() : entry.getPartner().getLegalName())
                        : "Đối tác";
                throw new BadRequestException("Không thể phê duyệt cảnh báo: Kênh thông tin '" + displayVal
                        + "' đã được chứng thực là tài nguyên số an toàn của đối tác thành viên [" + partnerName + "].");
            }
        }

        // Secondary check against verified partner profiles
        List<PartnerProfile> profiles = partnerProfileRepository.findAll();
        for (PartnerProfile profile : profiles) {
            if (profile.getVerificationStatus() != PartnerVerificationStatus.VERIFIED) {
                continue;
            }
            if (type == IndicatorType.URL && StringUtils.hasText(profile.getOfficialDomain())) {
                String offDomain = profile.getOfficialDomain().trim().toLowerCase(Locale.ROOT);
                if (offDomain.startsWith("www.")) offDomain = offDomain.substring(4);
                for (String val : lookupValues) {
                    String valHost = val.toLowerCase(Locale.ROOT);
                    if (valHost.contains("://")) valHost = valHost.substring(valHost.indexOf("://") + 3);
                    int slashIdx = valHost.indexOf('/');
                    if (slashIdx >= 0) valHost = valHost.substring(0, slashIdx);
                    int colonIdx = valHost.indexOf(':');
                    if (colonIdx >= 0) valHost = valHost.substring(0, colonIdx);
                    if (valHost.equals(offDomain) || valHost.endsWith("." + offDomain)) {
                        String partnerName = profile.getBrandName() != null ? profile.getBrandName() : profile.getLegalName();
                        throw new BadRequestException("Không thể phê duyệt cảnh báo: Kênh thông tin '" + displayVal
                                + "' đã được chứng thực là tài nguyên số an toàn của đối tác thành viên [" + partnerName + "].");
                    }
                }
            } else if (type == IndicatorType.PHONE && StringUtils.hasText(profile.getOfficialHotline())) {
                String offHotline = profile.getOfficialHotline().replaceAll("[\\s().-]", "");
                for (String val : lookupValues) {
                    if (val.replaceAll("[\\s().-]", "").equals(offHotline)) {
                        String partnerName = profile.getBrandName() != null ? profile.getBrandName() : profile.getLegalName();
                        throw new BadRequestException("Không thể phê duyệt cảnh báo: Kênh thông tin '" + displayVal
                                + "' đã được chứng thực là tài nguyên số an toàn của đối tác thành viên [" + partnerName + "].");
                    }
                }
            }
        }
    }

    private int parsePort(String portStr) {
        try {
            return Integer.parseInt(portStr);
        } catch (NumberFormatException e) {
            return -2;
        }
    }

    private IndicatorType supportedIndicatorType(String value) {
        if (!StringUtils.hasText(value)) return null;
        String type = value.trim().toUpperCase(Locale.ROOT);
        if ("WEBSITE".equals(type) || "DOMAIN".equals(type)) return IndicatorType.URL;
        if ("BRANDNAME".equals(type) || "SMS_BRANDNAME".equals(type)) return IndicatorType.PHONE;
        try {
            return IndicatorType.valueOf(type);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private String formatDescription(String indicatorType, String indicatorValue, String categoryCode, String userDescription) {
        String baseDesc = userDescription != null ? userDescription.trim() : "";
        String result = baseDesc;
        if (StringUtils.hasText(indicatorType) && supportedIndicatorType(indicatorType) == null) {
            throw new BadRequestException("Loại đối tượng phải là PHONE, URL hoặc BANK_ACCOUNT");
        }
        if (StringUtils.hasText(indicatorType) && StringUtils.hasText(indicatorValue)) {
            String catPart = StringUtils.hasText(categoryCode) ? " | Category: " + categoryCode.trim() : "";
            result = String.format("[Target: %s:%s%s]\n%s", indicatorType.trim(), indicatorValue.trim(), catPart, baseDesc);
        }
        if (result.length() > 255) {
            throw new BadRequestException("Mô tả chi tiết và thông tin chỉ số vượt quá giới hạn 255 ký tự");
        }
        return result;
    }

    private record ParsedTarget(String indicatorType, String indicatorValue, String categoryCode, String cleanDescription) {}

    private ParsedTarget parseTarget(String description) {
        if (!StringUtils.hasText(description)) {
            return new ParsedTarget(null, null, null, "");
        }
        Matcher matcher = TARGET_HEADER_PATTERN.matcher(description);
        if (matcher.find()) {
            String type = matcher.group(1);
            String val = matcher.group(2);
            String cat = matcher.group(3);
            String clean = matcher.group(4);
            return new ParsedTarget(
                    type != null ? type.trim() : null,
                    val != null ? val.trim() : null,
                    cat != null ? cat.trim() : null,
                    clean != null ? clean.trim() : ""
            );
        }

        return new ParsedTarget(null, null, null, description.trim());
    }

    private String normalizeIdentifier(String type, String value) {
        if (!StringUtils.hasText(value)) return "";
        String trimmed = value.trim();
        String upperType = type != null ? type.toUpperCase(Locale.ROOT) : "";

        if ("PHONE".equals(upperType)) {
            String digits = trimmed.replaceAll("[\\s().-]", "");
            return digits.startsWith("+84") ? "0" + digits.substring(3) : digits;
        } else if ("URL".equals(upperType) || "WEBSITE".equals(upperType) || "DOMAIN".equals(upperType)) {
            String lower = trimmed.toLowerCase(Locale.ROOT);
            if (lower.startsWith("https://")) lower = lower.substring(8);
            else if (lower.startsWith("http://")) lower = lower.substring(7);
            if (lower.endsWith("/")) lower = lower.substring(0, lower.length() - 1);
            return lower;
        } else if ("BANK_ACCOUNT".equals(upperType)) {
            return trimmed.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
        }
        return trimmed.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
    }

    private ScamCategory resolveCategory(String categoryCode) {
        if (!StringUtils.hasText(categoryCode)) return null;
        return scamCategorieRepository.findByCode(categoryCode)
                .orElseGet(() -> scamCategorieRepository.findByName(categoryCode).orElse(null));
    }

    private PartnerSubmissionResponse mapToResponse(PartnerOfficialAlert alert, String indicatorAction) {
        String code = String.format("PAL-%04d", alert.getId());
        ParsedTarget target = parseTarget(alert.getDescription());

        PartnerDocument document = null;
        if (alert.getEvidenceId() != null) {
            document = partnerDocumentRepository.findById(alert.getEvidenceId()).orElse(null);
        }

        String reviewNotes = auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("PARTNER_OFFICIAL_ALERT", alert.getId())
                .stream()
                .filter(l -> "VERIFY_PARTNER_SUBMISSION".equals(l.getAction()) || "REJECT_PARTNER_SUBMISSION".equals(l.getAction()))
                .map(AuditLog::getReason)
                .findFirst()
                .orElse(null);

        Long indicatorId = null;
        Long confirmedId = null;
        boolean isConfirmed = false;

        if (StringUtils.hasText(target.indicatorType()) && StringUtils.hasText(target.indicatorValue())) {
            String rawType = target.indicatorType().toUpperCase(Locale.ROOT);
            IndicatorType type = supportedIndicatorType(rawType);
            String normalized = normalizeIdentifier(rawType, target.indicatorValue());

            Optional<Indicator> indOpt = type == null ? Optional.empty() : indicatorRepository.findByTypeAndNormalizedValue(type, normalized);


            if (indOpt.isPresent()) {
                indicatorId = indOpt.get().getId();
                Optional<ConfirmedIndicator> confOpt = confirmedIndicatorRepository.findByIndicatorId(indicatorId);
                if (confOpt.isPresent() && confOpt.get().getStatus() == ConfirmedIndicatorStatus.ACTIVE) {
                    confirmedId = confOpt.get().getId();
                    isConfirmed = true;
                }
            }
        }

        ScamCategory cat = resolveCategory(target.categoryCode());

        return PartnerSubmissionResponse.builder()
                .id(alert.getId())
                .submissionCode(code)
                .submissionType(alert.getSubmissionType())
                .title(alert.getTitle())
                .description(target.cleanDescription())
                .indicatorType(target.indicatorType())
                .indicatorValue(target.indicatorValue())
                .normalizedValue(StringUtils.hasText(target.indicatorType()) && StringUtils.hasText(target.indicatorValue())
                        ? normalizeIdentifier(target.indicatorType(), target.indicatorValue()) : null)
                .indicatorId(indicatorId)
                .indicatorAction(indicatorAction != null ? indicatorAction : (indicatorId != null ? "RESOLVED" : "NONE"))
                .categoryCode(target.categoryCode())
                .categoryName(cat != null ? cat.getName() : null)
                .status(alert.getStatus())
                .evidenceUrl(document != null ? "/api/partner/submissions/" + alert.getId() + "/evidence" : null)
                .evidenceFileName(document != null ? document.getFileName() : null)
                .evidenceContentType(document != null ? document.getContentType() : null)
                .evidenceFileSize(document != null ? document.getFileSize() : null)
                .partnerId(alert.getPartner() != null ? alert.getPartner().getId() : null)
                .partnerLegalName(alert.getPartner() != null ? alert.getPartner().getLegalName() : null)
                .partnerBrandName(alert.getPartner() != null ? alert.getPartner().getBrandName() : null)
                .reviewedByName(alert.getReviewedBy() != null ? alert.getReviewedBy().getFullName() : null)
                .reviewedAt(alert.getReviewedAt())
                .reviewNotes(reviewNotes)
                .confirmedIndicatorId(confirmedId)
                .isConfirmed(isConfirmed)
                .createdAt(alert.getCreatedAt())
                .updatedAt(alert.getReviewedAt() != null ? alert.getReviewedAt() : alert.getCreatedAt())
                .build();
    }
}
