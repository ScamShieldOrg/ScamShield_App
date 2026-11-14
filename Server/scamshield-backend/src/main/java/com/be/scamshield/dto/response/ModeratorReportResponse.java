package com.be.scamshield.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin chi tiết một ca báo cáo lừa đảo dành cho kiểm duyệt viên")
public class ModeratorReportResponse {

    @Schema(description = "Mã hồ sơ định dạng hiển thị", example = "CS-2024-1891")
    private String id;

    @Schema(description = "ID gốc trong cơ sở dữ liệu", example = "1891")
    private Long rawId;

    @Schema(description = "Đối tượng bị báo cáo (SĐT, tên miền, STK, tiêu đề...)", example = "0909 123 456")
    private String targetIdentifier;

    @Schema(description = "Loại đối tượng (PHONE, WEBSITE, BANK_ACCOUNT...)", example = "PHONE")
    private String targetType;

    private String description;
    private String reportedMessage;

    @Schema(description = "Tên danh mục thủ đoạn chính", example = "Lừa đảo ngân hàng / OTP Phishing")
    private String category;

    @Schema(description = "ID của danh mục thủ đoạn", example = "1")
    private Long categoryId;

    @Schema(description = "Tổng số lượng báo cáo gộp cho đối tượng này", example = "47")
    private Integer reportCount;

    @Schema(description = "Họ tên đầy đủ của người gửi báo cáo", example = "Nguyễn Thành")
    private String reportedBy;

    @Schema(description = "Thời gian gửi báo cáo định dạng", example = "15/01/2024 14:32")
    private String reportedAt;
    private String processedAt;

    @Schema(description = "Trạng thái hiển thị (Pending, Approved, Rejected)", example = "Pending")
    private String status;

    @Schema(description = "Tài khoản hiện tại có quyền nhận duyệt báo cáo")
    private boolean canReview;
    private boolean assignedToMe;

    @Schema(description = "Indicator thuộc whitelist đang có hiệu lực; cảnh báo hỗ trợ quyết định")
    private boolean whitelisted;
    private List<WhitelistMatch> whitelistMatches;

    private IndicatorContext indicatorContext;
    private ReporterContext reporterContext;

    public record IndicatorContext(String blacklistStatus, long reports, long approvedReports, long rejectedReports, long disputes,
                                   LocalDateTime firstSeenAt, LocalDateTime lastSeenAt) { }

    public record ReporterContext(String email, String phoneNumber, Integer reputationPoints,
                                  LocalDateTime joinedAt, long reports, long approvedReports, long decidedReports,
                                  long disputes, long approvedDisputes, long decidedDisputes,
                                  long abuseFlags, long openFlags) { }

    public record WhitelistMatch(Long whitelistEntryId, Long partnerId, String legalName,
                                 LocalDateTime verifiedAt) { }


    @Schema(description = "Điểm đánh giá AI (0 - 100). Hiện tại để trống theo yêu cầu", example = "null")
    private Integer aiScore;

    @Schema(description = "Cấp độ rủi ro AI (SCAM-RISK, SUSPICIOUS, SAFE). Hiện tại để trống theo yêu cầu", example = "null")
    private String aiRiskLevel;

    @Schema(description = "Độ tin cậy của AI. Hiện tại để trống theo yêu cầu", example = "null")
    private String aiConfidence;

    @Schema(description = "Số lượng minh chứng được cung cấp trong báo cáo", example = "3")
    private Integer evidenceCount;


    @Schema(description = "Danh sách bằng chứng đính kèm")
    private List<ModeratorEvidenceResponse> evidences;

    @Schema(description = "Danh sách nhãn phân loại (Taxonomies) - hiện lấy từ danh mục duy nhất của báo cáo")
    private List<String> taxonomies;

}
