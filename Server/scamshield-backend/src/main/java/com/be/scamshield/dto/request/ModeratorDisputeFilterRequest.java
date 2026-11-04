package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tham số lọc danh sách hàng chờ khiếu nại dành cho kiểm duyệt viên")
public class ModeratorDisputeFilterRequest {

    @Schema(description = "Từ khóa tìm kiếm (mã AP-2024-XXXX, số điện thoại, tên miền, người gửi, danh mục)", example = "0383 456 789")
    private String search;

    @Schema(description = "Lọc theo trạng thái (ALL, PENDING, IN_REVIEW, APPROVED, REJECTED hoặc Đang xét, Chấp nhận, Từ chối)", example = "ALL")
    private String status;

    @Schema(description = "Số trang (bắt đầu từ 0)", example = "0")
    @Builder.Default
    private int page = 0;

    @Schema(description = "Số lượng bản ghi mỗi trang", example = "10")
    @Builder.Default
    private int size = 10;

    @Schema(description = "Trường và hướng sắp xếp (ví dụ: createdAt,desc)", example = "createdAt,desc")
    @Builder.Default
    private String sort = "createdAt,desc";
}
