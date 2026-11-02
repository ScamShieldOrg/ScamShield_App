package com.be.scamshield.dto.admin;

import com.be.scamshield.constant.EvidenceVerificationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Chi tiết hồ sơ lạm dụng tài khoản để quản trị viên đối chiếu trước khi quyết định")
public class AdminAbuseEscalationDetailResponse {
    private AdminAbuseEscalationResponse escalation;
    private AccountDetails accountDetails;
    private ReportActivity activity;
    private List<RelatedReport> reports;
    private List<AuditEntry> auditTrail;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Thông tin hiện tại bổ sung cho tài khoản trong escalation")
    public static class AccountDetails {
        private String phoneNumber;
        private Boolean phoneVerified;
        private Integer reputationPoints;
        private LocalDateTime joinedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Tính từ dữ liệu report hiện tại trong 24 giờ kết thúc tại createdAt của hồ sơ; không phải snapshot bất biến")
    public static class ReportActivity {
        private LocalDateTime windowStart;
        private LocalDateTime windowEnd;
        private long totalReports;
        private long rejectedReports;
        private long distinctIndicators;

        @Schema(description = "Phần trăm REJECTED trên tổng report trong kỳ, gồm cả report chưa duyệt; null nếu tổng bằng 0")
        private BigDecimal rejectedPercentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelatedReport {
        private Long id;
        private String reportCode;
        private Long indicatorId;
        private String targetType;
        private String targetValue;
        private Long categoryId;
        private String categoryName;
        private String status;
        private String description;
        private String reportedMessage;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LatestModeration latestModeration;
        private List<Evidence> evidences;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LatestModeration {
        private Long id;
        private String action;
        private String reason;
        private Long moderatorUserId;
        private String moderatorName;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Evidence {
        private Long id;
        private String evidenceType;
        private String fileName;
        private String fileUrl;
        private String sourceUrl;
        private String extractedText;
        private String ocrText;
        @Schema(description = "Trạng thái xác minh bằng chứng; null nếu giá trị dữ liệu cũ không được hỗ trợ")
        private EvidenceVerificationStatus verificationStatus;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditEntry {
        private Long id;
        private Long actorUserId;
        private String actorName;
        private String action;
        private String previousValue;
        private String newValue;
        private String reason;
        private LocalDateTime createdAt;
    }
}
