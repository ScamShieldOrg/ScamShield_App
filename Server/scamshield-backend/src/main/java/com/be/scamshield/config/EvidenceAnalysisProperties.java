package com.be.scamshield.config;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.validation.annotation.Validated;

@Component
@ConfigurationProperties(prefix = "app.evidence-analysis")
@Validated
@Getter
@Setter
public class EvidenceAnalysisProperties {
    private boolean enabled = true;
    private String executable = "tesseract";
    private String tessdataDirectory = "";
    private String languages = "vie+eng";
    @Min(1) @Max(60) private int timeoutSeconds = 15;
    @Min(1) @Max(10) private int maxPdfPages = 3;
    @Min(60) @Max(20000) private int maxTextCharacters = 8000;
    @Min(1) @Max(40) private int maxImageMegapixels = 16;
    @Min(1) @Max(50) private int maxFileMegabytes = 25;
    @Min(0) @Max(20) private int imageDistance = 10;
    @Min(0) @Max(24) private int textCandidateDistance = 12;
    @DecimalMin("0.5") @DecimalMax("1.0") private double textSimilarity = 0.80;
    @Min(30) @Max(500) private int minimumTextCharacters = 60;
    @Min(20) @Max(500) private int candidateLimit = 200;
}
