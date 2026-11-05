package com.be.scamshield.dto.partner;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu gửi cảnh báo lừa đảo hoặc tình báo đe dọa từ đối tác doanh nghiệp")
public class SubmitPartnerAlertRequest {

    @NotBlank(message = "Loại nội dung không được để trống (SCAM_ALERT hoặc THREAT_INTEL)")
    @Schema(description = "Loại nội dung gửi: SCAM_ALERT hoặc THREAT_INTEL", example = "THREAT_INTEL")
    private String submissionType;

    @NotBlank(message = "Tiêu đề cảnh báo không được để trống")
    @Size(min = 5, max = 255, message = "Tiêu đề phải từ 5 đến 255 ký tự")
    @Schema(description = "Tiêu đề cảnh báo hoặc mối đe dọa", example = "Phát hiện tên miền giả mạo thương hiệu Shopee")
    private String title;

    @NotBlank(message = "Mô tả chi tiết không được để trống")
    @Size(min = 10, max = 5000, message = "Mô tả chi tiết phải từ 10 đến 5000 ký tự")
    @Schema(description = "Mô tả chi tiết thủ đoạn hoặc mối đe dọa kèm thông tin điều tra", example = "Trang web chứa giao diện lừa đảo nạp tiền làm nhiệm vụ cộng tác viên.")
    private String description;

    @Schema(description = "Loại chỉ số: PHONE, WEBSITE, BANK_ACCOUNT", example = "WEBSITE")
    private String indicatorType;

    @Schema(description = "Giá trị chỉ số nhận diện (URL, số điện thoại, số tài khoản)", example = "shopee-tuyendung-ctv.xyz")
    private String indicatorValue;

    @Schema(description = "Mã danh mục lừa đảo liên quan (ví dụ: GIA_DANH_TMDT, VIEC_LAM)", example = "GIA_DANH_TMDT")
    private String categoryCode;

    @Schema(description = "Đường dẫn tệp bằng chứng đã tải lên (nếu dùng presigned upload)", example = "https://storage.scamshield.vn/evidences/partner-evidence.png")
    private String evidenceUrl;

    @Schema(description = "Tên tệp bằng chứng đính kèm", example = "evidence-screenshot.png")
    private String evidenceFileName;

    @Schema(description = "Tệp bằng chứng đính kèm dạng MultipartFile", hidden = true)
    private org.springframework.web.multipart.MultipartFile file;
}

