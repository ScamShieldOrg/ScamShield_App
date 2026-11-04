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
@Schema(description = "Thông tin hạn mức kiểm tra AI trong ngày của khách vãng lai")
public class GuestQuotaResponse {

    @Schema(description = "Tổng số lượt kiểm tra AI tối đa trong ngày", example = "5")
    private int limit;

    @Schema(description = "Số lượt kiểm tra AI đã dùng trong ngày", example = "2")
    private int used;

    @Schema(description = "Số lượt kiểm tra AI còn lại trong ngày", example = "3")
    private int remaining;

    @Schema(description = "Thời điểm hệ thống đặt lại hạn mức (nửa đêm hôm nay theo giờ Việt Nam)", example = "2026-10-16T00:00:00")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime resetsAt;
}
