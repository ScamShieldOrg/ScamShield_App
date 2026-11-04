package com.be.scamshield.dto.request;

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
@Schema(description = "Yêu cầu ra quyết định thẩm định báo cáo lừa đảo dành cho kiểm duyệt viên")
public class ModeratorDecisionRequest {

    public enum DecisionType {
        APPROVE,
        REJECT
    }

    @NotNull(message = "Quyết định kiểm duyệt không được để trống")
    @Schema(description = "Quyết định kiểm duyệt (APPROVE: Phê duyệt, REJECT: Từ chối)", example = "APPROVE")
    private DecisionType decision;

    @NotBlank(message = "Lý do kiểm duyệt không được để trống")
    @Size(min = 20, max = 2000, message = "Lý do bắt buộc tối thiểu 20 ký tự theo quy định audit trail")
    @Schema(description = "Lý do thẩm định chi tiết (lưu audit trail bất biến)", example = "Đã đối chiếu chứng từ giao dịch ngân hàng khớp số tài khoản lừa đảo")
    private String reason;

    @Schema(description = "ID của danh mục thủ đoạn lừa đảo (ScamCategory) được xác nhận", example = "1")
    private Long categoryId;
}
