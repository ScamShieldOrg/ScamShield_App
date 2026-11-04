package com.be.scamshield.controller;

import com.be.scamshield.config.SecurityConfig;
import com.be.scamshield.dto.response.*;
import com.be.scamshield.security.CustomAccessDeniedHandler;
import com.be.scamshield.security.CustomUserDetailsService;
import com.be.scamshield.security.JwtAuthenticationEntryPoint;
import com.be.scamshield.security.JwtTokenProvider;
import com.be.scamshield.service.IGuestLeaderboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GuestLeaderboardController.class)
@Import({SecurityConfig.class, JwtAuthenticationEntryPoint.class, CustomAccessDeniedHandler.class})
class GuestLeaderboardControllerTest {

    private static final String BASE_URL = "/api/guest/leaderboard";

    @MockitoBean
    private IGuestLeaderboardService guestLeaderboardService;

    @MockitoBean
    private JwtTokenProvider tokenProvider;

    @MockitoBean
    private CustomUserDetailsService customUserDetailsService;

    @Autowired
    private MockMvc mvc;

    @Test
    void getLeaderboardReturnsSuccessWithAllUiSections() throws Exception {
        LeaderboardStatCardResponse card1 = LeaderboardStatCardResponse.builder()
                .key("ACTIVE_EXPERTS")
                .label("CHUYÊN GIA KÍCH HOẠT")
                .value("14,820")
                .rawValue(14820L)
                .sub("+328 chuyên gia tuần này")
                .icon("UserFocus")
                .build();

        LeaderboardPodiumItemResponse rank1 = LeaderboardPodiumItemResponse.builder()
                .rank(1)
                .anonymousIdentifier("Hunter_#1029")
                .badge("HẠNG NHẤT TOÀN QUỐC")
                .subtitle("Định danh xác thực cấp cao")
                .footerLeft("An toàn tuyệt đối (Zero PII)")
                .footerRight("#VN-01")
                .avatar("H1")
                .rankTier("HỘ VỆ BẠCH KIM")
                .contributions(1540L)
                .contributionsFormatted("1,540")
                .accuracy("99.7%")
                .build();

        LeaderboardRankingItemResponse row4 = LeaderboardRankingItemResponse.builder()
                .rank("04")
                .rankNumber(4)
                .avatar("S4")
                .name("Sentinel_#402")
                .rankTier("HỘ VỆ BẠCH KIM")
                .score("1,215")
                .acc("99.3%")
                .build();

        GuestLeaderboardResponse mockResponse = GuestLeaderboardResponse.builder()
                .stats(List.of(card1))
                .topThree(LeaderboardTopThreeResponse.builder().rank1(rank1).build())
                .rankings(List.of(row4))
                .filters(List.of(LeaderboardFilterOptionResponse.builder().id("THIS_MONTH").label("Tháng 05/2025").active(true).build()))
                .activeFilter("THIS_MONTH")
                .build();

        when(guestLeaderboardService.getLeaderboard(eq("THIS_MONTH"))).thenReturn(mockResponse);

        mvc.perform(get(BASE_URL).param("timeRange", "THIS_MONTH"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.stats[0].label").value("CHUYÊN GIA KÍCH HOẠT"))
                .andExpect(jsonPath("$.data.stats[0].value").value("14,820"))
                .andExpect(jsonPath("$.data.topThree.rank1.anonymousIdentifier").value("Hunter_#1029"))
                .andExpect(jsonPath("$.data.topThree.rank1.badge").value("HẠNG NHẤT TOÀN QUỐC"))
                .andExpect(jsonPath("$.data.rankings[0].rank").value("04"))
                .andExpect(jsonPath("$.data.rankings[0].name").value("Sentinel_#402"))
                .andExpect(jsonPath("$.data.activeFilter").value("THIS_MONTH"));

        verify(guestLeaderboardService).getLeaderboard("THIS_MONTH");
    }

    @Test
    void getLeaderboardPublicAccessWithoutAuthentication() throws Exception {
        when(guestLeaderboardService.getLeaderboard("THIS_MONTH"))
                .thenReturn(GuestLeaderboardResponse.builder().activeFilter("THIS_MONTH").build());

        mvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }
}
