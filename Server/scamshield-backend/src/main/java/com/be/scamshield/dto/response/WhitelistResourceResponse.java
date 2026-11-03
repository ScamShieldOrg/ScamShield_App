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
public class WhitelistResourceResponse {
    private Long id;
    private String name;
    private String brandName;
    private String taxId;
    private String representativeNameAndTitle;
    private List<String> officialHotlines;
    private List<String> officialDomains;
    private List<String> smsBrandNames;
    private List<VerifiedIndicator> verifiedIndicators;
    private LocalDateTime verifiedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifiedIndicator {
        private Long id;
        private String resourceType;
        private String value;
        private LocalDateTime verifiedAt;
    }
}
