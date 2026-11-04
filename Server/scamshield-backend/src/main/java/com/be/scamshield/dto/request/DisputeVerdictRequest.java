package com.be.scamshield.dto.request;

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
@Schema(description = "Yêu cầu phán quyết kháng nghị của kiểm duyệt viên")
public class DisputeVerdictRequest {

    @NotBlank(message = "Phán quyết không được để trống")
    @Schema(description = "Phán quyết: RETRACT (Thu hồi chỉ số / Chấp nhận kháng nghị) hoặc UPHOLD (Duy trì quyết định / Từ chối kháng nghị)", example = "RETRACT")
    private String verdict;

    @NotBlank(message = "Lý do phán quyết không được để trống")
    @Size(min = 20, message = "Lý do bắt buộc phải có ít nhất 20 ký tự")
    @Schema(description = "Lý do giải thích đánh giá bằng chứng phản bác và căn cứ ra quyết định (tối thiểu 20 ký tự)", example = "Bằng chứng giấy phép kinh doanh và chứng từ thuế hợp lệ, xác minh số tổng đài chính thức.")
    private String reason;
}
