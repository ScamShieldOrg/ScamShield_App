package com.be.scamshield.service;

import com.be.scamshield.dto.response.GuestLeaderboardResponse;

public interface IGuestLeaderboardService {
    GuestLeaderboardResponse getLeaderboard(String timeRange);
}
