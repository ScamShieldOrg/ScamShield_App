package com.be.scamshield.dto.admin;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(description = "Bộ lọc hàng đợi hồ sơ lạm dụng tài khoản dành cho quản trị viên")
public class AdminAbuseEscalationFilterRequest {

    @NotBlank(message = "Trạng thái không được để trống")
    @Pattern(regexp = "PENDING|DISMISSED|OPEN|ALL", message = "Trạng thái phải là PENDING, DISMISSED, OPEN hoặc ALL")
    @Schema(description = "ALL gồm ba trạng thái đang hỗ trợ, không gồm RESOLVED cũ",
            defaultValue = "PENDING", allowableValues = {"PENDING", "DISMISSED", "OPEN", "ALL"})
    private String status = "PENDING";

    @Size(max = 100, message = "Từ khóa tìm kiếm không được vượt quá 100 ký tự")
    @Schema(description = "Tìm theo tên, email, số điện thoại tài khoản; hoặc mã chính xác ESC-0041 / U-00842")
    private String search;

    @NotBlank(message = "Cách sắp xếp không được để trống")
    @Pattern(regexp = "(?i)(priority|createdAt),(asc|desc)",
            message = "Sắp xếp phải là priority,asc; priority,desc; createdAt,asc hoặc createdAt,desc")
    @Schema(description = "priority dựa trên severity: HIGH > MEDIUM > LOW; mức không xác định xếp cuối. "
            + "Cùng mức ưu tiên xếp createdAt DESC, id DESC.", defaultValue = "createdAt,desc",
            allowableValues = {"priority,asc", "priority,desc", "createdAt,asc", "createdAt,desc"})
    private String sort = "createdAt,desc";

    @Min(value = 0, message = "Chỉ số trang không được nhỏ hơn 0")
    @Schema(description = "Chỉ số trang, bắt đầu từ 0", defaultValue = "0")
    private int page = 0;

    @Min(value = 1, message = "Số lượng hồ sơ mỗi trang phải từ 1 trở lên")
    @Max(value = 100, message = "Số lượng hồ sơ mỗi trang tối đa 100")
    @Schema(description = "Số lượng hồ sơ mỗi trang", defaultValue = "20")
    private int size = 20;
}
