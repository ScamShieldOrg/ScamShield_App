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
@Schema(description = "Số lượng hồ sơ theo từng tab trong hàng đợi kiểm duyệt")
public class ModeratorQueueCountsResponse {

    @Schema(description = "Tổng số hồ sơ trong hàng đợi", example = "7")
    private long all;

    @Schema(description = "Số hồ sơ đang chờ duyệt (Pending)", example = "3")
    private long pending;

    @Schema(description = "Số hồ sơ đang xem xét (In Review)", example = "1")
    private long inReview;

}
