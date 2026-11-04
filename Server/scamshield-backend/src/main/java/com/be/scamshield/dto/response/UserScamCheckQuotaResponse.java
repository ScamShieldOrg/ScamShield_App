package com.be.scamshield.dto.response;

import java.time.LocalDateTime;

public record UserScamCheckQuotaResponse(
        Long userId,
        String fullName,
        String rankName,
        int limit,
        int used,
        int remaining,
        LocalDateTime resetsAt
) { }
