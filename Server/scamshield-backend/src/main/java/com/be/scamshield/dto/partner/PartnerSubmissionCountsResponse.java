package com.be.scamshield.dto.partner;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thống kê số lượng hồ sơ cảnh báo / tình báo đối tác")
public class PartnerSubmissionCountsResponse {

    @Schema(description = "Tổng số hồ sơ", example = "50")
    private long totalCount;

    @Schema(description = "Số hồ sơ chờ duyệt", example = "12")
    private long pendingCount;

    @Schema(description = "Số hồ sơ đã xác thực", example = "30")
    private long verifiedCount;

    @Schema(description = "Số hồ sơ bị từ chối", example = "8")
    private long rejectedCount;
}

