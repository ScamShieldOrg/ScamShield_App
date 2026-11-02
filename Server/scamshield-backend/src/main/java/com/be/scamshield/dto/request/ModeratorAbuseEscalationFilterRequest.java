package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Schema(description = "Bộ lọc lịch sử hồ sơ lạm dụng của một tài khoản")
public class ModeratorAbuseEscalationFilterRequest {

    @Pattern(regexp = "PENDING|DISMISSED|OPEN", message = "Trạng thái phải là PENDING, DISMISSED hoặc OPEN")
    @Schema(description = "Bỏ trống để lấy cả ba trạng thái đang hỗ trợ",
            allowableValues = {"PENDING", "DISMISSED", "OPEN"})
    private String status;

    @Min(value = 0, message = "Chỉ số trang không được nhỏ hơn 0")
    @Schema(description = "Chỉ số trang, bắt đầu từ 0", defaultValue = "0")
    private int page = 0;

    @Min(value = 1, message = "Số lượng hồ sơ mỗi trang phải từ 1 trở lên")
    @Max(value = 100, message = "Số lượng hồ sơ mỗi trang tối đa 100")
    @Schema(description = "Số lượng hồ sơ mỗi trang", defaultValue = "20")
    private int size = 20;
}
