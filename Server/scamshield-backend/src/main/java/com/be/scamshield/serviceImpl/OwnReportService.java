package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.ReportStatus;
import static com.be.scamshield.util.ReportEvidenceTypeResolver.resolveEvidenceType;
import com.be.scamshield.constant.EvidenceVerificationStatus;
import com.be.scamshield.constant.VietnamProvince;
import com.be.scamshield.dto.request.UpdateOwnReportRequest;
import com.be.scamshield.dto.response.ReportDetailTrackingResponse;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IUserReportTrackingService;
import com.be.scamshield.service.IOwnReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class OwnReportService implements IOwnReportService {
    private final ReportRepository reports;
    private final IndicatorRepository indicators;
    private final ReportEvidenceRepository evidences;
    private final ModerationActionRepository moderation;
    private final ScamCategorieRepository categories;
    private final AuditLogRepository audits;
    private final IUserReportTrackingService tracking;
    private final Clock applicationClock;

    private Report editable(Long id, UserPrincipal principal) {
        if (principal == null || principal.getId() == null) throw new UnauthorizedException("Vui lòng đăng nhập");
        if (id == null || id <= 0) throw new BadRequestException("ID báo cáo phải là số dương");
        // Serialize edits/withdrawals with moderator decisions for the same indicator.
        indicators.lockForReport(id);
        Report report = reports.findByIdAndReporterUserId(id, principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy báo cáo của bạn"));
        if (report.getStatus() != ReportStatus.PENDING || !moderation.findByReportIdOrderByCreatedAtDesc(id).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chỉ được sửa hoặc thu hồi báo cáo chưa bắt đầu kiểm duyệt");
        }
        return report;
    }

    @Transactional
    public ReportDetailTrackingResponse update(Long id, UpdateOwnReportRequest request, UserPrincipal principal) {
        Report report = editable(id, principal);
        if (request.getDescription() == null || request.getDescription().isBlank()) throw new BadRequestException("Mô tả không được để trống");
        report.setDescription(request.getDescription().strip());
        String message = request.getReportedMessage();
        if (message != null) {
            report.setReportedMessage(message.isBlank() ? null : message);
        }
        if (request.getRegionCode() != null) {
            String region = request.getRegionCode().strip();
            if (VietnamProvince.fromCode(region).isEmpty()) throw new BadRequestException("Vui lòng chọn tỉnh/thành hợp lệ trong danh sách");
            report.setRegionCode(VietnamProvince.fromCode(region).orElseThrow());
        }
        if (request.getCategoryId() != null) {
            report.setCategory(categories.findById(request.getCategoryId())
                    .orElseThrow(() -> new BadRequestException("Danh mục không tồn tại")));
        }
        LocalDateTime now = LocalDateTime.now(applicationClock);
        if (request.getEvidences() != null) {
            evidences.deleteAll(evidences.findByReportId(id));
            for (var item : request.getEvidences()) {
                evidences.save(ReportEvidence.builder().report(report).fileUrl(item.getFileUrl())
                        .fileName(item.getFileName()).fileHash(item.getFileHash())
                        .evidenceType(resolveEvidenceType(item.getEvidenceType(), item.getFileName(), item.getFileUrl()))
                        .verificationStatus(EvidenceVerificationStatus.PENDING).createdAt(now).build());
            }
        }
        report.setUpdatedAt(now);
        reports.save(report);
        audit(report, "UPDATE_OWN_REPORT", "PENDING", now);
        return tracking.getReportDetail(principal.getId(), id);
    }

    @Transactional
    public void withdraw(Long id, UserPrincipal principal) {
        Report report = editable(id, principal);
        report.setStatus(ReportStatus.WITHDRAWN);
        LocalDateTime now = LocalDateTime.now(applicationClock);
        report.setUpdatedAt(now);
        reports.save(report);
        audit(report, "WITHDRAW_OWN_REPORT", "WITHDRAWN", now);
    }

    private void audit(Report report, String action, String newStatus, LocalDateTime now) {
        audits.save(AuditLog.builder().actorUser(report.getReporterUser()).entityType("REPORT").entityId(report.getId())
                .action(action).previousValue("PENDING").newValue(newStatus)
                .reason("Người gửi tự cập nhật hoặc thu hồi báo cáo trước kiểm duyệt").createdAt(now).build());
    }
}
