package com.be.scamshield.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAbuseFlagResponse {

    private Long id;
    private String flagType;
    private String severity;
    private String status;
    private String reason;
    private String evidence;
    private LocalDateTime createdAt;
    private LocalDateTime resolvedAt;

}
