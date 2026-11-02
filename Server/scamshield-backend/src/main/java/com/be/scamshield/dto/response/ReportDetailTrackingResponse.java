package com.be.scamshield.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Chi tiết tiến trình và lịch sử đối soát của một báo cáo")
public class ReportDetailTrackingResponse {

    @Schema(description = "Mã báo cáo", example = "#RPT-8492")
    private String id;

    @Schema(description = "ID gốc", example = "8492")
    private Long rawId;

    @Schema(description = "Mã băm đầy đủ", example = "e9b4c09d5718a287b41e8f2038752a1f")
    private String fullHash;

    @Schema(description = "Mã băm rút gọn", example = "e9b4...2a1f")
    private String hashId;

    @Schema(description = "Loại mục tiêu", example = "PHONE")
    private String targetType;

    @Schema(description = "Giá trị mục tiêu", example = "0898421234")
    private String targetValue;

    @Schema(description = "Mô tả mục tiêu phụ", example = "Đầu số MobiFone phát tán")
    private String targetSub;

    @Schema(description = "Danh mục lừa đảo", example = "Mạo danh cán bộ thuế/A05")
    private String category;
    private Long categoryId;
    private String regionCode;

    @Schema(description = "Nội dung tin nhắn / cuộc gọi lừa đảo")
    private String reportedMessage;

    @Schema(description = "Mô tả chi tiết từ người báo cáo")
    private String description;

    @Schema(description = "Trạng thái", example = "APPROVED_BLACKLIST")
    private String status;

    @Schema(description = "Thời gian gửi")
    private LocalDateTime createdAt;

    @Schema(description = "Thời gian cập nhật")
    private LocalDateTime updatedAt;

    @Schema(description = "Tiến độ SLA", example = "Xong trong 14 phút")
    private String slaTime;

    @Schema(description = "Trạng thái SLA", example = "completed")
    private String slaStatus;

    @Schema(description = "Danh sách bằng chứng đính kèm")
    private List<EvidenceDetailDto> evidences;

    @Schema(description = "Lịch sử các bước kiểm duyệt / đối soát")
    private List<ModerationStepDto> moderationHistory;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvidenceDetailDto {
        private Long id;
        private String evidenceType;
        private String fileUrl;
        private String fileName;
        private String fileHash;
        private String ocrText;
        private String verificationStatus;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ModerationStepDto {
        private Long id;
        private String action;
        private String reason;
        private String previousStatus;
        private String newStatus;
        private String moderatorName;
        private LocalDateTime createdAt;
    }
}
