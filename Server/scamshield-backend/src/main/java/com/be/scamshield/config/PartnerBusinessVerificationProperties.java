package com.be.scamshield.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.partner-business-verification")
public class PartnerBusinessVerificationProperties {
    @Min(1)
    @Max(60)
    private int connectTimeoutSeconds = 5;
    @Min(1)
    @Max(120)
    private int readTimeoutSeconds = 30;
    @Min(1)
    @Max(120)
    private int totalBudgetSeconds = 60;
    @DecimalMin("0.0")
    @DecimalMax("1.0")
    private double minimumOcrConfidence = 0.9;
    @Valid
    private Xinvoice xinvoice = new Xinvoice();
    @Valid
    private Ocr ocr = new Ocr();

    @Getter
    @Setter
    public static class Xinvoice {
        private String baseUrl = "https://api.xinvoice.vn";
        private String clientId = "";
        private String apiKey = "";
    }

    @Getter
    @Setter
    public static class Ocr {
        // TODO: Enable after obtaining OCR credentials and validating the provider on sample PDFs.
        private boolean enabled = false;
        // No demo endpoint is used implicitly for private business documents.
        private String url = "";
        private String apiKey = "";
        private String apiSecret = "";
    }
}
