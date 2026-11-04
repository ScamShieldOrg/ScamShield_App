package com.be.scamshield.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LeaderboardTopThreeResponse {
    private LeaderboardPodiumItemResponse rank1;
    private LeaderboardPodiumItemResponse rank2;
    private LeaderboardPodiumItemResponse rank3;
}
