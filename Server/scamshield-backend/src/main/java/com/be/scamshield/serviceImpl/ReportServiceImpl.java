package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.constant.VietnamProvince;

import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.dto.request.EvidenceItemDto;
import com.be.scamshield.dto.request.PresignedUrlRequest;
import com.be.scamshield.dto.response.PresignedUrlResponse;
import com.be.scamshield.dto.response.ReportEvidenceResponse;
import com.be.scamshield.dto.response.ReportResponse;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
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
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
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

    private final ReportRepository reportRepository;
    private final ReportEvidenceRepository reportEvidenceRepository;
    private final IndicatorRepository indicatorRepository;
    private final ScamCategorieRepository scamCategorieRepository;
    private final UserRepository userRepository;
    private final SupabaseStorageService supabaseStorageService;

    @Override
    @Transactional
    public ReportResponse createReport(CreateReportRequest request, List<MultipartFile> files, UserPrincipal currentUser) {
        // Check ownership before creating indicators/reports, uploading files, or awarding points.
        User reporterUser = resolveReporterUser(currentUser);
        String regionCode = StringUtils.hasText(request.getRegionCode()) ? request.getRegionCode().strip() : null;
        if (regionCode != null && VietnamProvince.fromCode(regionCode).isEmpty()) {
            throw new BadRequestException("Mã tỉnh/thành không hợp lệ; vui lòng chọn từ danh sách tỉnh/thành");
        }
        if ("PHONE".equalsIgnoreCase(request.getThreatType().trim())
                && StringUtils.hasText(reporterUser.getPhoneNumber())
                && normalizePhoneForOwnershipCheck(reporterUser.getPhoneNumber())
                        .equals(normalizePhoneForOwnershipCheck(request.getTargetIdentifier()))) {
            throw new BadRequestException("Không thể tự báo cáo chính mình.");
        }

        // 1. Resolve & normalize target indicator
        String normalizedValue = normalizeIdentifier(request.getTargetIdentifier());
        Indicator indicator = indicatorRepository
                .findByTypeAndNormalizedValue(request.getThreatType(), normalizedValue)
                .orElseGet(() -> {
                    Indicator newIndicator = Indicator.builder()
                            .type(request.getThreatType())
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
                .regionCode(regionCode)
                .description(request.getDescription())
                .reportedMessage(StringUtils.hasText(request.getReportedMessage()) ? request.getReportedMessage() : null)
                .status("PENDING")


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
                        String evidenceType = resolveEvidenceType(null, file.getOriginalFilename(), null);
                        SupabaseStorageService.UploadResult uploadResult = supabaseStorageService.uploadFile(file, "evidences");
                        uploadedKeys.add(uploadResult.objectKey());
                        ReportEvidence evidence = ReportEvidence.builder()
                                .report(savedReport)
                                .evidenceType(evidenceType)
                                .fileName(file.getOriginalFilename())
                                .fileUrl(uploadResult.fileUrl())
                                .fileHash(uploadResult.fileHash())
                                .verificationStatus("PENDING")
                                .createdAt(LocalDateTime.now())
                                .build();
                        evidenceList.add(reportEvidenceRepository.save(evidence));
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

        // 6. Process Evidence Items (Pre-uploaded Supabase Storage URLs)
        if (request.getEvidences() != null && !request.getEvidences().isEmpty()) {
            for (EvidenceItemDto dto : request.getEvidences()) {
                if (StringUtils.hasText(dto.getFileUrl())) {
                    ReportEvidence evidence = ReportEvidence.builder()
                            .report(savedReport)
                            .evidenceType(resolveEvidenceType(dto.getEvidenceType(), dto.getFileName(), dto.getFileUrl()))
                            .fileName(dto.getFileName())
                            .fileUrl(dto.getFileUrl())
                            .fileHash(dto.getFileHash())
                            .verificationStatus("PENDING")
                            .createdAt(LocalDateTime.now())
                            .build();
                    evidenceList.add(reportEvidenceRepository.save(evidence));
                }
            }
        }

        // Process simple string attachment URLs
        if (request.getAttachmentUrls() != null && !request.getAttachmentUrls().isEmpty()) {
            for (String url : request.getAttachmentUrls()) {
                if (StringUtils.hasText(url)) {
                    ReportEvidence evidence = ReportEvidence.builder()
                            .report(savedReport)
                            .evidenceType(resolveEvidenceType(null, null, url))
                            .fileUrl(url)
                            .verificationStatus("PENDING")
                            .createdAt(LocalDateTime.now())
                            .build();
                    evidenceList.add(reportEvidenceRepository.save(evidence));
                }
            }
        }

        // 7. Award Reputation Points (+50 points for submitting a report)
        int rewardPoints = 50;
        if (reporterUser != null) {
            int currentPoints = reporterUser.getReputationPoints() != null ? reporterUser.getReputationPoints() : 0;
            reporterUser.setReputationPoints(currentPoints + rewardPoints);
            userRepository.save(reporterUser);
        }

        return mapToResponse(savedReport, evidenceList, rewardPoints);
    }

    @Override
    public PresignedUrlResponse generatePresignedUrl(PresignedUrlRequest request) {
        return supabaseStorageService.generatePresignedUploadUrl(request.getFileName(), request.getContentType());
    }

    @Override
    @Transactional(readOnly = true)
    public ReportResponse getReportById(Long id) {
        Report report = reportRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy báo cáo lừa đảo với ID: " + id));
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

    private String normalizeIdentifier(String identifier) {
        if (!StringUtils.hasText(identifier)) return "";
        return identifier.replaceAll("\\s+", "").toLowerCase();
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

    private String resolveEvidenceType(String declaredType, String fileName, String fileUrl) {
        String declared = StringUtils.hasText(declaredType) ? declaredType.strip().toUpperCase(Locale.ROOT) : null;
        if (declared != null) {
            declared = switch (declared) {
                case "JPEG" -> "JPG";
                case "JPG", "PNG", "PDF" -> declared;
                default -> throw new BadRequestException("Loại minh chứng chỉ được là JPG, PNG hoặc PDF");
            };
        }
        String name = fileName;
        if (!StringUtils.hasText(name) && StringUtils.hasText(fileUrl)) {
            try {
                name = URI.create(fileUrl).getPath();
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("URL minh chứng không hợp lệ");
            }
        }
        String detected = detectEvidenceType(name);
        if (StringUtils.hasText(fileName) && detected == null) {
            throw new BadRequestException("Tệp minh chứng chỉ hỗ trợ JPG, PNG hoặc PDF");
        }
        if (declared != null && detected != null && !declared.equals(detected)) {
            throw new BadRequestException("Loại minh chứng không khớp định dạng tệp");
        }
        if (detected == null && declared == null) {
            throw new BadRequestException("Không xác định được định dạng minh chứng; cần tên tệp hoặc evidenceType JPG, PNG, PDF");
        }
        return detected != null ? detected : declared;
    }

    private String detectEvidenceType(String filename) {
        if (!StringUtils.hasText(filename)) return null;
        String lower = filename.strip().toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPG";
        if (lower.endsWith(".png")) return "PNG";
        if (lower.endsWith(".pdf")) return "PDF";
        return null;
    }

    private ReportResponse mapToResponse(Report report, List<ReportEvidence> evidences, int rewardPoints) {
        String reportCode = String.format("#RPT-%04d", report.getId());
        List<ReportEvidenceResponse> evidenceResponses = evidences.stream().map(e ->
                ReportEvidenceResponse.builder()
                        .id(e.getId())
                        .evidenceType(e.getEvidenceType())
                        .fileUrl(e.getFileUrl())
                        .fileHash(e.getFileHash())
                        .verificationStatus(e.getVerificationStatus())
                        .createdAt(e.getCreatedAt())
                        .build()
        ).toList();

        return ReportResponse.builder()
                .id(report.getId())
                .reportCode(reportCode)
                .targetIdentifier(report.getIndicator() != null ? report.getIndicator().getDisplayValue() : "")
                .threatType(report.getIndicator() != null ? report.getIndicator().getType() : "")
                .categoryName(report.getCategory() != null ? report.getCategory().getName() : "")
                .description(report.getDescription())
                .reportedMessage(report.getReportedMessage())
                .regionCode(report.getRegionCode())
                .status(report.getStatus())
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
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.trim().getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is not available", e);
        }
    }}
