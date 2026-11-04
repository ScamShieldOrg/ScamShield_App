package com.be.scamshield.dto.response;

import com.fasterxml.jackson.annotation.JsonFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin phiên làm việc của khách vãng lai")
public class GuestSessionResponse {

    @Schema(description = "Token phiên khách vãng lai (lưu ở client và gửi kèm header X-Guest-Session)",
            example = "gs_9b3f021ad45e481aa661299ef87b001a")
    private String sessionToken;

    @Schema(description = "Thời điểm phiên hết hạn", example = "2026-11-14T10:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime expiresAt;
}
