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
@Schema(description = "Tham số tìm kiếm và lọc danh sách hồ sơ kiểm duyệt từ đối tác")
public class PartnerSubmissionFilterRequest {

    @Schema(description = "Trạng thái hồ sơ: ALL, PENDING, VERIFIED, REJECTED", example = "PENDING")
    private String status;

    @Schema(description = "Loại hồ sơ: ALL, SCAM_ALERT, THREAT_INTEL", example = "THREAT_INTEL")
    private String submissionType;

    @Schema(description = "Từ khóa tìm kiếm (tiêu đề, chỉ số, thương hiệu đối tác)", example = "Shopee")
    private String search;

    @Builder.Default
    @Schema(description = "Số trang (bắt đầu từ 0)", example = "0")
    private int page = 0;

    @Builder.Default
    @Schema(description = "Số lượng bản ghi mỗi trang", example = "10")
    private int size = 10;

    @Builder.Default
    @Schema(description = "Thuộc tính sắp xếp", example = "createdAt")
    private String sortBy = "createdAt";

    @Builder.Default
    @Schema(description = "Chiều sắp xếp (ASC hoặc DESC)", example = "DESC")
    private String sortDirection = "DESC";
}

