package com.be.scamshield.dto.request;

import com.be.scamshield.constant.AbuseEscalationDecision;
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
@Schema(description = "Quyết định cuối cùng của quản trị viên cho hồ sơ đang PENDING")
public class DecideAbuseEscalationRequest {
    @NotNull(message = "Quyết định không được để trống")
    private AbuseEscalationDecision decision;

    @NotBlank(message = "Lý do quyết định không được để trống")
    @Size(min = 20, max = 2000, message = "Lý do quyết định phải từ 20 đến 2000 ký tự")
    private String reason;
}
