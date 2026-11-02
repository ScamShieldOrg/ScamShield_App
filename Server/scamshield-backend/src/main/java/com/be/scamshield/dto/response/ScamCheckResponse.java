package com.be.scamshield.dto.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ScamCheckResponse(
        Long checkId,
        Long verdictId,
        String inputType,
        String status,
        String verdict,
        String decidedByStage,
        String categoryCode,
        BigDecimal confidence,
        String explanation,
        String safetyGuidance,
        String unknownReason,
        MatchedIndicator matchedIndicator,
        List<Reason> reasons,
        LocalDateTime createdAt,
        LocalDateTime completedAt,
        LocalDateTime retentionExpiresAt,
        ScamCheckAiDetails aiDetails
) {
    public record MatchedIndicator(Long id, String type, String value) { }
    public record Reason(String code, String sourceStage, String detail) { }
}
