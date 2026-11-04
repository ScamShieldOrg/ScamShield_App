package com.be.scamshield.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GuestLeaderboardResponse {
    private List<LeaderboardStatCardResponse> stats;
    private LeaderboardTopThreeResponse topThree;
    private List<LeaderboardRankingItemResponse> rankings;
    private List<LeaderboardFilterOptionResponse> filters;
    private String activeFilter;
}
