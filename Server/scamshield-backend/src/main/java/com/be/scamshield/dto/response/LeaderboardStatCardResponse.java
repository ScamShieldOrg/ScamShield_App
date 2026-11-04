package com.be.scamshield.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardStatCardResponse {
    private String key;
    private String label;
    private String value;
    private Long rawValue;
    private String sub;
    private String icon;
}
