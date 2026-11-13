package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import com.fasterxml.jackson.annotation.JsonIgnore;
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

    @Size(max = 2000, message = "Lý do tối đa 2000 ký tự")
    @Schema(description = "Lý do bắt buộc khi REJECT (20–2000 ký tự), không bắt buộc khi APPROVE", example = "Đã đối chiếu chứng từ giao dịch ngân hàng khớp số tài khoản lừa đảo")
    private String reason;

    @JsonIgnore
    @AssertTrue(message = "REJECT bắt buộc lý do từ 20 đến 2000 ký tự")
    public boolean isRejectionReasonValid() {
        return decision != DecisionType.REJECT || (reason != null && reason.strip().length() >= 20
                && reason.strip().length() <= 2000);
    }


    @Schema(description = "ID của danh mục thủ đoạn lừa đảo (ScamCategory) được xác nhận", example = "1")
    private Long categoryId;

}
