package com.be.scamshield.dto.response;

import com.be.scamshield.constant.EvidenceVerificationStatus;
import com.be.scamshield.constant.DisputePriority;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.constant.DisputeLegalRelationship;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "Một hồ sơ khiếu nại đã nộp; các thời điểm là giờ Việt Nam (Asia/Ho_Chi_Minh)")
public record DisputeListItemResponse(
        Long id,
        @Schema(description = "Mã hiển thị tạo từ ID hồ sơ", example = "DSP-3091")
        String disputeCode,
        DisputeStatus status,
        @Schema(description = "NORMAL: bình thường; HIGH: ưu tiên cao")
        DisputePriority priority,
        String reason,
        @Schema(description = "Quan hệ pháp lý do người gửi khai báo, chưa phải kết quả xác minh")
        DisputeLegalRelationship legalRelationship,
        LocalDateTime declarationAcceptedAt,
        @Schema(description = "Thông báo tiến trình hiện tại, có thể null nếu chưa cập nhật")
        String progressMessage,
        @Schema(description = "Thời điểm dự kiến trả kết quả, có thể null; không phải thời điểm hoàn tất thực tế")
        LocalDateTime estimatedResolutionAt,
        @Schema(description = "Yêu cầu bổ sung bằng chứng, có thể null nếu không yêu cầu")
        String supplementReason,
        @Schema(description = "Hạn cuối bổ sung bằng chứng theo giờ Việt Nam; null khi không có yêu cầu bổ sung")
        LocalDateTime supplementDeadline,
        @Schema(description = "Kết luận giải quyết hồ sơ, có thể null khi chưa có kết luận")
        String resolutionReason,
        @Schema(description = "Đường dẫn biên bản hoặc quyết định giải quyết, có thể null khi chưa có file")
        String resolutionDocumentUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime resolvedAt,
        IndicatorSummary indicator,
        @Schema(description = "Số bằng chứng có fileUrl không trống, tương ứng số tệp đính kèm")
        int evidenceCount,
        @Schema(description = "Các tệp bằng chứng của hồ sơ; không trả fileHash hay thông tin người xử lý")
        List<Attachment> attachments
) {
    public record IndicatorSummary(
            Long id,
            String type,
            String displayValue,
            @Schema(description = "Trạng thái của xác thực blacklist liên quan đến hồ sơ")
            String blacklistStatus,
            LocalDateTime retractedAt
    ) {
    }

    public record Attachment(
            Long id,
            String evidenceType,
            @Schema(description = "Tên file để hiển thị; có thể null với dữ liệu cũ")
            String fileName,
            String fileUrl,
            @Schema(description = "Dung lượng tệp tính bằng byte; null với dữ liệu cũ")
            Long fileSize,
            String contentType,
            String description,
            EvidenceVerificationStatus verificationStatus,
            LocalDateTime createdAt
    ) {
    }
}
