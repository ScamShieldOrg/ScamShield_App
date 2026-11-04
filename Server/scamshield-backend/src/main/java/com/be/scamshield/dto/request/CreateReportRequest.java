package com.be.scamshield.dto.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateReportRequest {

    @NotBlank(message = "Loại đối tượng báo cáo không được để trống")
    @Schema(allowableValues = {"PHONE", "BANK_ACCOUNT", "URL"},
            description = "Loại Indicator: PHONE, BANK_ACCOUNT hoặc URL")
    private String threatType;

    @NotBlank(message = "Chỉ số mục tiêu (Số điện thoại, URL hoặc STK) không được để trống")
    private String targetIdentifier;

    @NotBlank(message = "Danh mục thủ đoạn không được để trống")
    private String category;

    @NotBlank(message = "Mô tả ngắn gọn hành vi không được để trống")
    private String description;

    @Size(max = 10000, message = "Nội dung tin nhắn lừa đảo tối đa 10.000 ký tự")
    @Schema(description = "Nguyên văn tin nhắn nghi lừa đảo do người dùng sao chép; không bắt buộc, tối đa 10.000 ký tự")
    private String reportedMessage;

    @Pattern(regexp = "^\\s*(?:[0-9]{2})?\\s*$", message = "Mã tỉnh/thành phải gồm 2 chữ số")
    @Schema(description = "Mã tỉnh/thành nơi người gửi đang có mặt khi tạo báo cáo, lấy từ /api/dashboard/filters; bắt buộc", example = "01")
    @NotBlank(message = "Vui lòng chọn tỉnh/thành nơi bạn đang có mặt khi gửi báo cáo")
    private String regionCode;

    @NotNull(message = "Bạn cần xác nhận thông tin cung cấp là trung thực")
    @AssertTrue(message = "Bạn cần xác nhận thông tin cung cấp là trung thực")
    private Boolean isConfirmed;


}
