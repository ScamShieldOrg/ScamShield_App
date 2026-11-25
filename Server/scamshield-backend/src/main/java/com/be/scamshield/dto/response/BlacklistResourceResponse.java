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
public class BlacklistResourceResponse {
    private Long id;
    private Long indicatorId;
    private String resourceType;
    private String title;
    private String categoryCode;
    private String categoryName;
    private String categoryDescription;
    private String severity;
    private String severityLabel;
    private String description;
    private Long warningCount;
    private boolean hasPublicImage;
    private LocalDateTime confirmedAt;
    private LocalDateTime updatedAt;
}
