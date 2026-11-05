package com.be.scamshield.dto.partner;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu kiểm duyệt hồ sơ tình báo / cảnh báo đối tác")
public class ReviewPartnerSubmissionRequest {

    public enum DecisionType {
        VERIFY,
        REJECT
    }

    @NotNull(message = "Quyết định thẩm định không được để trống (VERIFY hoặc REJECT)")
    @Schema(description = "Quyết định thẩm định: VERIFY hoặc REJECT", example = "VERIFY")
    private DecisionType decision;

    @NotBlank(message = "Lý do thẩm định không được để trống")
    @Size(min = 10, max = 2000, message = "Lý do thẩm định phải từ 10 đến 2000 ký tự")
    @Schema(description = "Căn cứ thẩm định để ghi nhận audit log và thông báo đối tác", example = "Đã xác thực chứng cứ giả mạo thương hiệu hợp lệ từ đối tác.")
    private String reason;
}

