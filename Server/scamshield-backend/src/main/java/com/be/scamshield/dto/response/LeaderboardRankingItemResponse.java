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
public class LeaderboardRankingItemResponse {
    private String rank;
    private int rankNumber;
    private String avatar;
    private String name;

    @JsonProperty("class")
    private String rankClass;

    private String rankTier;
    private String score;
    private Long rawScore;
    private String acc;
    private String accuracy;
}
