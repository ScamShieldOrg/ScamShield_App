package com.be.scamshield.dto.request;

import com.be.scamshield.constant.PartnerVerificationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminPartnerReviewRequest {
    @NotNull(message = "Cần chọn phê duyệt hoặc từ chối")
    private PartnerVerificationStatus verificationStatus;

    @Size(max = 2000, message = "Lý do tối đa 2000 ký tự")
    private String reason;
}
