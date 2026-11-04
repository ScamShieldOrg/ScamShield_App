package com.be.scamshield.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardPodiumItemResponse {
    private int rank;
    private String anonymousIdentifier;
    private String badge;
    private String subtitle;
    private String footerLeft;
    private String footerRight;
    private String avatar;

    @JsonProperty("class")
    private String rankClass;

    private String rankTier;
    private Long contributions;
    private String contributionsFormatted;
    private String accuracy;
}
