package com.be.scamshield.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateStatusRequest {

    @NotBlank(message = "Trạng thái mới không được để trống")
    private String status;

    private String reason;

}
