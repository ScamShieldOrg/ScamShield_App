package com.be.scamshield.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Danh sách hàng chờ khiếu nại kèm số lượng thống kê dành cho kiểm duyệt viên")
public class ModeratorDisputeQueueResponse {

    @Schema(description = "Danh sách hồ sơ kháng nghị")
    private List<ModeratorDisputeResponse> items;

    @Schema(description = "Số lượng hồ sơ đang chờ xem xét (Đang xét)", example = "2")
    private long pendingCount;

    @Schema(description = "Tổng số lượng hồ sơ thỏa mãn bộ lọc", example = "3")
    private long totalItems;

    @Schema(description = "Trang hiện tại (bắt đầu từ 0)", example = "0")
    private int currentPage;

    @Schema(description = "Số lượng bản ghi mỗi trang", example = "10")
    private int pageSize;

    @Schema(description = "Tổng số trang", example = "1")
    private int totalPages;

    @Schema(description = "Có trang kế tiếp hay không", example = "false")
    private boolean hasNext;

    @Schema(description = "Có trang trước hay không", example = "false")
    private boolean hasPrevious;

    @JsonProperty("data")
    public List<ModeratorDisputeResponse> getData() {
        return items;
    }
}
