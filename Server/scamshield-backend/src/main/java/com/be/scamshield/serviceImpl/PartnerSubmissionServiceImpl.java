package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
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
import com.be.scamshield.exception.BadRequestException;
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
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
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
    private static final Pattern URL_PATTERN =
            Pattern.compile("(?i)(https?://[^\\s]+|[a-zA-Z0-9.-]+\\.(?:com|vn|net|org|xyz|top|online|me|info|biz|cc|io|co|us|vip|app|live)(?:/[^\\s]*)?)");
    private static final Pattern PHONE_PATTERN =
            Pattern.compile("(?:\\+84|0)(?:3|5|7|8|9)\\d{8}");

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
    private final Clock applicationClock;

    @Override
    @Transactional
    public PartnerSubmissionResponse submitAlertOrIntel(
            SubmitPartnerAlertRequest request,
            MultipartFile file,
            UserPrincipal currentUser) {

        PartnerProfile partnerProfile = resolveActivePartnerProfile(currentUser);
        LocalDateTime now = LocalDateTime.now(applicationClock);

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
                        .type("PARTNER_SUBMISSION_REJECTED")
                        .title("Hồ sơ cảnh báo/tình báo bị từ chối")
                        .message(safeMessage)
                        .referenceType("PARTNER_SUBMISSION")
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
                String type = ("WEBSITE".equals(rawType) || "DOMAIN".equals(rawType)) ? "URL" : rawType;
                String normalizedVal = normalizeIdentifier(type, target.indicatorValue());

                Optional<Indicator> existingIndicatorOpt = indicatorRepository.findByTypeAndNormalizedValue(type, normalizedVal);
                if (existingIndicatorOpt.isEmpty() && "URL".equals(type)) {
                    existingIndicatorOpt = indicatorRepository.findByTypeAndNormalizedValue("WEBSITE", normalizedVal);
                    if (existingIndicatorOpt.isEmpty()) {
                        existingIndicatorOpt = indicatorRepository.findByTypeAndNormalizedValue("DOMAIN", normalizedVal);
                    }
                }

                Indicator indicator;

                if (existingIndicatorOpt.isPresent()) {
                    indicator = existingIndicatorOpt.get();
                    if ("URL".equals(type) && !"URL".equals(indicator.getType())) {
                        indicator.setType("URL");
                    }
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
                    confirmed.setStatus("ACTIVE");
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
                            .status("ACTIVE")
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
                        .type("PARTNER_SUBMISSION_VERIFIED")
                        .title("Hồ sơ cảnh báo/tình báo đã được xác thực")
                        .message(safeMessage)
                        .referenceType("PARTNER_SUBMISSION")
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

    private String formatDescription(String indicatorType, String indicatorValue, String categoryCode, String userDescription) {
        String baseDesc = userDescription != null ? userDescription.trim() : "";
        String result = baseDesc;
        if (StringUtils.hasText(indicatorType) && StringUtils.hasText(indicatorValue)) {
            String catPart = StringUtils.hasText(categoryCode) ? " | Category: " + categoryCode.trim() : "";
            result = String.format("[Target: %s:%s%s]\n%s", indicatorType.trim(), indicatorValue.trim(), catPart, baseDesc);
        }
        // Giới hạn an toàn <= 255 ký tự khớp với độ dài cột varchar(255) trong PostgreSQL
        if (result.length() > 255) {
            result = result.substring(0, 255);
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

        // Fallback tự động nhận diện nếu dữ liệu cũ không có header [Target: ...]
        Matcher urlMatcher = URL_PATTERN.matcher(description);
        if (urlMatcher.find()) {
            return new ParsedTarget("URL", urlMatcher.group(1).trim(), "PHISHING_PORTAL", description.trim());
        }

        Matcher phoneMatcher = PHONE_PATTERN.matcher(description);
        if (phoneMatcher.find()) {
            return new ParsedTarget("PHONE", phoneMatcher.group().trim(), "SMS_BTS", description.trim());
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
            String type = ("WEBSITE".equals(rawType) || "DOMAIN".equals(rawType)) ? "URL" : rawType;
            String normalized = normalizeIdentifier(type, target.indicatorValue());

            Optional<Indicator> indOpt = indicatorRepository.findByTypeAndNormalizedValue(type, normalized);
            if (indOpt.isEmpty() && "URL".equals(type)) {
                indOpt = indicatorRepository.findByTypeAndNormalizedValue("WEBSITE", normalized);
                if (indOpt.isEmpty()) {
                    indOpt = indicatorRepository.findByTypeAndNormalizedValue("DOMAIN", normalized);
                }
            }

            if (indOpt.isPresent()) {
                indicatorId = indOpt.get().getId();
                Optional<ConfirmedIndicator> confOpt = confirmedIndicatorRepository.findByIndicatorId(indicatorId);
                if (confOpt.isPresent() && "ACTIVE".equalsIgnoreCase(confOpt.get().getStatus())) {
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
