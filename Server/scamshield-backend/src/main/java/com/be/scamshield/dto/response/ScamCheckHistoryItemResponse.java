package com.be.scamshield.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScamCheckHistoryItemResponse {
    private String id;
    private String timestamp;
    private LocalDateTime createdAt;
    private String ip;
    private Boolean isRetroactive;
    private String targetType;
    private String targetValue;
    private String targetDetail;
    private String snippet;
    private String category;
    private String verdictLabel;
    private String verdictStatus;
    private Integer riskScore;
}
