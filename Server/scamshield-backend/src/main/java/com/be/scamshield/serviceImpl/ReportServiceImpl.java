package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.constant.ReportStatus;
import static com.be.scamshield.util.ReportEvidenceTypeResolver.resolveEvidenceType;
import com.be.scamshield.external.SupabaseStorageService;
import org.springframework.context.ApplicationEventPublisher;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.constant.VietnamProvince;
import com.be.scamshield.constant.IndicatorType;

import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.dto.response.ReportEvidenceResponse;
import com.be.scamshield.dto.response.ReportResponse;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.ReportEvidenceRepository;
import com.be.scamshield.repository.ReportRepository;
import com.be.scamshield.repository.ScamCategorieRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IReportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.nio.charset.StandardCharsets;
import com.be.scamshield.config.ReportPrivacyProperties;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.util.HexFormat;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReportServiceImpl implements IReportService {
    private final ReportPrivacyProperties reportPrivacyProperties;


    private final ApplicationEventPublisher events;
    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository reportEvidenceRepository;
    private final IndicatorRepository indicatorRepository;
    private final ScamCategorieRepository scamCategorieRepository;
    private final UserRepository userRepository;
    private final SupabaseStorageService supabaseStorageService;
    private final ReportAssignmentService reviewAssignments;
    private final EvidenceAnalysisQueueService evidenceAnalysis;

    @Override
    @Transactional
    public ReportResponse createReport(CreateReportRequest request, List<MultipartFile> files, UserPrincipal currentUser) {
        // Check ownership before creating indicators/reports, uploading files, or awarding points.
        User reporterUser = resolveReporterUser(currentUser);
        String regionCode = StringUtils.hasText(request.getRegionCode()) ? request.getRegionCode().strip() : null;
        if (regionCode == null || VietnamProvince.fromCode(regionCode).isEmpty()) {
            throw new BadRequestException("Mã tỉnh/thành không hợp lệ; vui lòng chọn từ danh sách tỉnh/thành");
        }
        IndicatorType reportType = IndicatorType.fromStoredValue(request.getThreatType())
                .orElseThrow(() -> new BadRequestException("Loại đối tượng báo cáo không được hỗ trợ"));
        if (reportType == IndicatorType.PHONE
                && StringUtils.hasText(reporterUser.getPhoneNumber())
                && normalizePhoneForOwnershipCheck(reporterUser.getPhoneNumber())
                        .equals(normalizePhoneForOwnershipCheck(request.getTargetIdentifier()))) {
            throw new BadRequestException("Không thể tự báo cáo chính mình.");
        }

        if (files == null || files.isEmpty()) {
            throw new BadRequestException("Vui lòng tải lên ít nhất một tệp bằng chứng");
        }
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty()) {
                throw new BadRequestException("Tệp bằng chứng không được rỗng");
            }
            resolveEvidenceType(null, file.getOriginalFilename(), null);
        }

        // 1. Resolve & normalize target indicator
        String target = request.getTargetIdentifier();
        String legacyValue = target.replaceAll("\\s+", "").toLowerCase(Locale.ROOT);
        String normalizedValue = switch (reportType) {
            case PHONE -> normalizePhoneForOwnershipCheck(target);
            case URL -> normalizeReportUrl(target);
            case BANK_ACCOUNT -> target.replaceAll("[\\s\\p{Z}]+", "").toUpperCase(Locale.ROOT);
        };
        if (!StringUtils.hasText(normalizedValue)) {
            throw new BadRequestException("Đối tượng báo cáo không hợp lệ");
        }
        Indicator indicator = indicatorRepository
                .findFirstByTypeAndNormalizedValueOrderByIdAsc(reportType, normalizedValue)
                .or(() -> indicatorRepository.findFirstByTypeAndNormalizedValueInOrderByIdAsc(
                        reportType, legacyIndicatorValues(reportType, normalizedValue, legacyValue)))
                .orElseGet(() -> {
                    Indicator newIndicator = Indicator.builder()
                            .type(reportType)
                            .normalizedValue(normalizedValue)
                            .displayValue(request.getTargetIdentifier())
                            .firstSeenAt(LocalDateTime.now())
                            .lastSeenAt(LocalDateTime.now())
                            .createdAt(LocalDateTime.now())
                            .updatedAt(LocalDateTime.now())
                            .build();
                    return indicatorRepository.save(newIndicator);
                });

        // 2. Resolve Scam Category
        ScamCategory category = resolveCategory(request.getCategory());

        // 4. Create & Save Report Entity
        ServletRequestAttributes attributes = RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes servletAttributes
                ? servletAttributes : null;
        String clientIp = attributes != null ? attributes.getRequest().getRemoteAddr() : null;
        Report report = Report.builder()
                .ipHash(hashClientSignal(clientIp))
                .reporterUser(reporterUser)
                .indicator(indicator)
                .category(category)
                .regionCode(VietnamProvince.fromCode(regionCode).orElseThrow())
                .description(request.getDescription())
                .reportedMessage(StringUtils.hasText(request.getReportedMessage()) ? request.getReportedMessage() : null)
                .status(ReportStatus.PENDING)

                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Report savedReport = reportRepository.save(report);

        // 5. Process Evidence Attachments (Direct Multipart Files Uploaded to Supabase Storage)
        List<ReportEvidence> evidenceList = new ArrayList<>();
        List<String> uploadedKeys = new ArrayList<>();

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != TransactionSynchronization.STATUS_COMMITTED) {
                        for (String key : uploadedKeys) {
                            try {
                                supabaseStorageService.deleteFile(key);
                            } catch (Exception e) {
                                log.warn("Failed to delete orphaned file on rollback [key={}]: {}", key, e.getMessage());
                            }
                        }
                    }
                }
            });
        }

        try {
            if (files != null && !files.isEmpty()) {
                for (MultipartFile file : files) {
                    if (!file.isEmpty()) {
                        ReportEvidenceType evidenceType = resolveEvidenceType(null, file.getOriginalFilename(), null);
                        SupabaseStorageService.UploadResult uploadResult = supabaseStorageService.uploadFile(file, "evidences");
                        uploadedKeys.add(uploadResult.objectKey());
                        ReportEvidence evidence = ReportEvidence.builder()
                                .report(savedReport)
                                .evidenceType(evidenceType)
                                .fileName(file.getOriginalFilename())
                                .fileUrl(uploadResult.fileUrl())
                                .fileHash(uploadResult.fileHash())
                                .createdAt(LocalDateTime.now())
                                .build();
                        evidenceAnalysis.prepare(evidence, uploadResult.objectKey());
                        evidenceList.add(reportEvidenceRepository.save(evidence));
                        if (evidence.getAnalysisStatus() == EvidenceAnalysisStatus.PENDING) {
                            events.publishEvent(new EvidenceAnalysisRequested(evidence.getId()));
                        }
                    }
                }
            }
        } catch (Exception e) {
            if (!TransactionSynchronizationManager.isActualTransactionActive()) {
                for (String key : uploadedKeys) {
                    try {
                        supabaseStorageService.deleteFile(key);
                    } catch (Exception ex) {
                        log.warn("Failed to delete orphaned file on error [key={}]: {}", key, ex.getMessage());
                    }
                }
            }
            throw e;
        }

        // Reputation is awarded only after a moderator approves the report.
        reviewAssignments.assignPendingReports();
        return mapToResponse(savedReport, evidenceList, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public ReportResponse getReportById(Long id, UserPrincipal currentUser) {
        if (currentUser == null || currentUser.getId() == null) throw new UnauthorizedException("Vui lòng đăng nhập để xem báo cáo");
        if (id == null || id <= 0) throw new BadRequestException("ID báo cáo phải là số nguyên dương");
        Report report = reportRepository.findByIdAndReporterUserId(id, currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo hoặc bạn không có quyền truy cập"));
        List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(id);
        return mapToResponse(report, evidences, 0);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ReportResponse> getMyReports(UserPrincipal currentUser) {
        User user = resolveReporterUser(currentUser);
        List<Report> reports = reportRepository.findByReporterUserIdOrderByCreatedAtDesc(user.getId());
        return reports.stream().map(r -> {
            List<ReportEvidence> evidences = reportEvidenceRepository.findByReportId(r.getId());
            return mapToResponse(r, evidences, 0);
        }).toList();
    }

    private List<String> legacyIndicatorValues(IndicatorType type, String normalized, String submitted) {
        List<String> values = new ArrayList<>();
        if (type == IndicatorType.URL) {
            for (String prefix : List.of("", "http://", "https://")) {
                values.add(prefix + normalized);
                if (!normalized.matches(".*[/#?].*")) {
                    values.add(prefix + normalized + "/");
                }
            }
            return values;
        }
        values.add(submitted);
        if (type == IndicatorType.PHONE && normalized.matches("0[0-9]{9}")) {
            String nationalNumber = normalized.substring(1);
            values.addAll(List.of("+84" + nationalNumber, "0084" + nationalNumber, "84" + nationalNumber));
        }
        return values;
    }

    private String normalizeReportUrl(String target) {
        String url = target.strip().replaceFirst("(?i)^https?://", "");
        String[] parts = url.split("(?=[/#?])", 2);
        String authority = parts[0].toLowerCase(Locale.ROOT);
        return parts.length == 1 || parts[1].equals("/") ? authority : authority + parts[1];
    }

    private String normalizePhoneForOwnershipCheck(String phone) {
        if (!StringUtils.hasText(phone)) return "";
        String normalized = phone.replaceAll("[\\s\\p{Z}().-]", "");
        if (normalized.startsWith("+84")) {
            normalized = normalized.substring(3);
        } else if (normalized.startsWith("0084")) {
            normalized = normalized.substring(4);
        } else if (normalized.startsWith("84") && (normalized.length() == 11
                || (normalized.length() == 12 && normalized.charAt(2) == '0'))) {
            normalized = normalized.substring(2);
        } else {
            return normalized;
        }
        return normalized.startsWith("0") ? normalized : "0" + normalized;
    }

    private ScamCategory resolveCategory(String categoryInput) {
        if (!StringUtils.hasText(categoryInput)) {
            return getFallbackCategory();
        }

        return scamCategorieRepository.findByCode(categoryInput)
                .orElseGet(() -> scamCategorieRepository.findByName(categoryInput)
                        .orElseGet(this::getFallbackCategory));
    }

    private ScamCategory getFallbackCategory() {
        return scamCategorieRepository.findAll().stream().findFirst()
                .orElseGet(() -> scamCategorieRepository.save(ScamCategory.builder()
                        .code("OTHER")
                        .name("Lừa đảo khác")
                        .description("Các hình thức lừa đảo chưa phân loại")
                        .version(1)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build()));
    }

    private User resolveReporterUser(UserPrincipal currentUser) {
        if (currentUser == null || currentUser.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện chức năng này.");
        }
        return userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy thông tin tài khoản người dùng đăng nhập."));
    }

    private ReportResponse mapToResponse(Report report, List<ReportEvidence> evidences, int rewardPoints) {
        String reportCode = String.format("#RPT-%04d", report.getId());
        List<ReportEvidenceResponse> evidenceResponses = evidences.stream().map(e ->
                ReportEvidenceResponse.builder()
                        .id(e.getId())
                        .evidenceType(e.getEvidenceType() == null ? null : e.getEvidenceType().name())
                        .fileUrl(e.getFileUrl())
                        .fileHash(e.getFileHash())
                        .createdAt(e.getCreatedAt())
                        .build()
        ).toList();

        return ReportResponse.builder()
                .id(report.getId())
                .reportCode(reportCode)
                .targetIdentifier(report.getIndicator() != null ? report.getIndicator().getDisplayValue() : "")
                .threatType(report.getIndicator() != null ? report.getIndicator().getType().name() : "")
                .categoryName(report.getCategory() != null ? report.getCategory().getName() : "")
                .description(report.getDescription())
                .reportedMessage(report.getReportedMessage())
                .regionCode(report.getRegionCode() == null ? null : report.getRegionCode().getCode())
                .status(report.getStatus() == null ? null : report.getStatus().name())
                .rewardPoints(rewardPoints)
                .evidenceCount(evidenceResponses.size())
                .evidences(evidenceResponses)
                .createdAt(report.getCreatedAt())
                .build();
    }
    private String hashClientSignal(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(reportPrivacyProperties.getIpHashSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(("report-ip:" + value.trim()).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Cannot hash client signal", e);
        }
    }}
