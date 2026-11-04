package com.be.scamshield.dto.request;

import com.be.scamshield.constant.AbuseFlagType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Nghi vấn lạm dụng tài khoản chuyển cho quản trị viên xét duyệt")
public class CreateAbuseEscalationRequest {
    @NotNull(message = "Loại nghi vấn không được để trống")
    @Schema(description = "Loại nghi vấn lạm dụng")
    private AbuseFlagType flagType;

    @NotBlank(message = "Lý do không được để trống")
    @Size(min = 20, max = 2000, message = "Lý do phải từ 20 đến 2000 ký tự")
    private String reason;

    @Size(max = 5000, message = "Ghi chú bằng chứng không được vượt quá 5000 ký tự")
    @Schema(description = "Ghi chú bằng chứng bổ sung, không bắt buộc")
    private String evidence;

    @NotEmpty(message = "Phải chọn ít nhất một báo cáo làm bằng chứng")
    @Size(max = 50, message = "Chỉ được chọn tối đa 50 báo cáo")
    @Schema(description = "Các ID báo cáo khác nhau, do chính tài khoản bị xem xét gửi")
    private List<@NotNull(message = "ID báo cáo không được để trống")
            @Positive(message = "ID báo cáo phải là số nguyên dương") Long> reportIds;
}
