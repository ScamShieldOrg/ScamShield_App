package com.be.scamshield.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContactVerificationEntry {
    private String tokenHash;
    private String phoneNumber;
    private LocalDateTime expiresAt;
    private LocalDateTime usedAt;
}
