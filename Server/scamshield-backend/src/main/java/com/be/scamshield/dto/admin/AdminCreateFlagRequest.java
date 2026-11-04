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
public class AdminCreateFlagRequest {

    @NotBlank(message = "Loại gắn cờ không được để trống")
    private String flagType;

    private String severity;

    private String reason;

    private String evidence;

}
