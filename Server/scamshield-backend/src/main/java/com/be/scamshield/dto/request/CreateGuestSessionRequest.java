package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu khởi tạo hoặc khôi phục phiên khách vãng lai")
public class CreateGuestSessionRequest {

    @Schema(description = "Token phiên hiện tại trên client (nếu có, để kiểm tra và khôi phục phiên)", example = "gs_9b3f021ad45e481aa661299ef87b001a")
    @Size(max = 128, message = "Token phiên không được vượt quá 128 ký tự")
    private String sessionToken;

    @Schema(description = "Fingerprint thiết bị từ client (Canvas/WebGL/Audio hash)", example = "fp_a1b2c3d4e5f6")
    @Size(max = 512, message = "Fingerprint thiết bị không được vượt quá 512 ký tự")
    private String deviceFingerprint;
}
