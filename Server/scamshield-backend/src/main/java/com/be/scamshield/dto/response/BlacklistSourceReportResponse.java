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
public class BlacklistSourceReportResponse {
    private Long id;
    private List<String> publicEvidenceUrls;
    private String description;
    private String categoryName;
    private LocalDateTime createdAt;
}
