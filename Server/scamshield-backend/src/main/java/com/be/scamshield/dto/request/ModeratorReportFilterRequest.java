package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Bộ lọc và phân trang hàng đợi xét duyệt báo cáo của kiểm duyệt viên")
public class ModeratorReportFilterRequest {

    @Schema(description = "Tab trạng thái hàng đợi (ALL, PENDING, IN_REVIEW)", defaultValue = "ALL", example = "ALL")
    @Builder.Default
    @Pattern(regexp = "(?i)\\s*(ALL|PENDING|IN_REVIEW|APPROVED|REJECTED|WITHDRAWN)\\s*",
            message = "Trạng thái báo cáo không hợp lệ")
    private String tab = "ALL";

    @Schema(description = "Từ khóa tìm kiếm (Mã hồ sơ CS-..., SĐT, URL, STK, danh mục, người gửi)")
    private String search;

    @Min(value = 0, message = "Chỉ số trang không được nhỏ hơn 0")
    @Schema(description = "Chỉ số trang (bắt đầu từ 0)", defaultValue = "0", example = "0")
    @Builder.Default
    private int page = 0;

    @Min(value = 1, message = "Số lượng hồ sơ mỗi trang phải từ 1 trở lên")
    @Max(value = 100, message = "Số lượng hồ sơ mỗi trang tối đa 100")
    @Schema(description = "Số lượng hồ sơ mỗi trang", defaultValue = "20", example = "20")
    @Builder.Default
    private int size = 20;

    @Schema(description = "Trường sắp xếp (ví dụ: createdAt,desc hoặc updatedAt,desc)", defaultValue = "createdAt,desc")
    @Builder.Default
    private String sort = "createdAt,desc";
}
