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
public class ReportEvidenceResponse {
    private Long id;
    private String evidenceType;
    private String fileUrl;
    private String fileHash;

    private LocalDateTime createdAt;
}
