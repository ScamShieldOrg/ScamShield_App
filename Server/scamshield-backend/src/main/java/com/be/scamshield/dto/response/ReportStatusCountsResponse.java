package com.be.scamshield.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Số lượng báo cáo theo từng trạng thái phục vụ các tab/pill lọc trên UI")
public class ReportStatusCountsResponse {

    @Schema(description = "Tất cả báo cáo", example = "18")
    private Long all;

    @Schema(description = "Đã thu hồi trước kiểm duyệt")
    private Long withdrawn;

    @Schema(description = "Đang chờ duyệt", example = "3")
    private Long pending;

    private Long inReview;

    @Schema(description = "Đã vào Blacklist", example = "14")
    private Long approvedBlacklist;

    @Schema(description = "Đã gộp trùng lặp", example = "1")
    private Long mergedDuplicate;

    @Schema(description = "Bị từ chối", example = "0")
    private Long rejected;
}
