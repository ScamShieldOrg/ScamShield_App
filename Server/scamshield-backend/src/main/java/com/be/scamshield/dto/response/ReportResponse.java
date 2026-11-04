package com.be.scamshield.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReportResponse {
    private Long id;
    private String reportCode; // e.g. #RPT-8492
    private String targetIdentifier;
    private String threatType;
    private String categoryName;
    private String description;
    private String reportedMessage;
    private String regionCode;
    private String status;
    private Integer rewardPoints;
    private Integer evidenceCount;
    private List<ReportEvidenceResponse> evidences;
    private LocalDateTime createdAt;
}
