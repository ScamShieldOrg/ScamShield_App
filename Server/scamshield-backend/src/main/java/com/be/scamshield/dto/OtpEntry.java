package com.be.scamshield.dto;

import com.be.scamshield.constant.OtpType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OtpEntry {
    private String target;
    private OtpType type;
    private String otpCode;
    private String provider;
    private String providerSessionInfo;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean isVerified;
    @Builder.Default
    private int failedAttempts = 0;
}
