package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.response.GuestLeaderboardResponse;
import com.be.scamshield.dto.response.LeaderboardStatCardResponse;
import com.be.scamshield.repository.GuestLeaderboardRepository;
import com.be.scamshield.repository.GuestLeaderboardRepository.UserContribution;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GuestLeaderboardServiceImplTest {

    @Mock
    private GuestLeaderboardRepository guestLeaderboardRepository;

    @Mock
    private Clock applicationClock;

    @InjectMocks
    private GuestLeaderboardServiceImpl service;

    private final LocalDateTime fixedNow = LocalDateTime.of(2025, 5, 16, 12, 0, 0);

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        lenient().when(applicationClock.instant()).thenReturn(fixedNow.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
    }

    @Test
    void getLeaderboardProducesRealMetricsAndUsesTopContributors() {
        when(guestLeaderboardRepository.countActiveUsers()).thenReturn(10L);
        when(guestLeaderboardRepository.countNewUsersSince(any(LocalDateTime.class))).thenReturn(5L);
        when(guestLeaderboardRepository.countNeutralizedThreats()).thenReturn(20L);

        List<UserContribution> mockContributors = new ArrayList<>();
        for (long i = 1; i <= 6; i++) {
            mockContributors.add(new UserContribution(i, "User " + i, (int) (1000 - i * 50), "HỘ VỆ BẠCH KIM", 10 - i));
        }
        when(guestLeaderboardRepository.findTopContributors(any(), eq(10))).thenReturn(mockContributors);

        GuestLeaderboardResponse response = service.getLeaderboard("THIS_MONTH");

        assertThat(response).isNotNull();

        // 1. Stats cards - real counts without baselines, accuracy/response-time omitted
        assertThat(response.getStats()).hasSize(2);
        LeaderboardStatCardResponse c1 = response.getStats().get(0);
        assertThat(c1.getKey()).isEqualTo("ACTIVE_EXPERTS");
        assertThat(c1.getValue()).isEqualTo("10");
        assertThat(c1.getSub()).isEqualTo("+5 chuyên gia tuần này");

        LeaderboardStatCardResponse c2 = response.getStats().get(1);
        assertThat(c2.getKey()).isEqualTo("THREATS_NEUTRALIZED");
        assertThat(c2.getValue()).isEqualTo("20");

        // 2. Podium Top 3 with anonymized user IDs
        assertThat(response.getTopThree()).isNotNull();
        assertThat(response.getTopThree().getRank1()).isNotNull();
        assertThat(response.getTopThree().getRank1().getAnonymousIdentifier()).isEqualTo("Hunter_#1001");
        assertThat(response.getTopThree().getRank1().getContributions()).isEqualTo(9L); // reportCount for THIS_MONTH
        assertThat(response.getTopThree().getRank1().getAccuracy()).isNull();

        assertThat(response.getTopThree().getRank2()).isNotNull();
        assertThat(response.getTopThree().getRank2().getAnonymousIdentifier()).isEqualTo("Sentinel_#1002");
        assertThat(response.getTopThree().getRank2().getContributions()).isEqualTo(8L);

        assertThat(response.getTopThree().getRank3()).isNotNull();
        assertThat(response.getTopThree().getRank3().getAnonymousIdentifier()).isEqualTo("Member_#1003");
        assertThat(response.getTopThree().getRank3().getContributions()).isEqualTo(7L);

        // 3. Table Rankings (indices 3 to 5 -> ranks 04 to 06)
        assertThat(response.getRankings()).hasSize(3);
        assertThat(response.getRankings().get(0).getRank()).isEqualTo("04");
        assertThat(response.getRankings().get(0).getName()).isEqualTo("Sentinel_#1004");
        assertThat(response.getRankings().get(0).getScore()).isEqualTo("6");
        assertThat(response.getRankings().get(0).getAcc()).isNull();

        // 4. Filters
        assertThat(response.getFilters()).hasSize(3);
        assertThat(response.getActiveFilter()).isEqualTo("THIS_MONTH");
    }

    @Test
    void passesDerivedSinceParameterToRepository() {
        ArgumentCaptor<LocalDateTime> sinceCaptor = ArgumentCaptor.forClass(LocalDateTime.class);

        // 1. ALL_TIME passes null since
        service.getLeaderboard("ALL_TIME");
        verify(guestLeaderboardRepository).findTopContributors(isNull(), eq(10));

        // 2. LAST_7_DAYS passes now - 7 days
        reset(guestLeaderboardRepository);
        service.getLeaderboard("LAST_7_DAYS");
        verify(guestLeaderboardRepository).findTopContributors(sinceCaptor.capture(), eq(10));
        assertThat(sinceCaptor.getValue()).isEqualTo(fixedNow.minusDays(7));

        // 3. THIS_MONTH passes start of month
        reset(guestLeaderboardRepository);
        service.getLeaderboard("THIS_MONTH");
        verify(guestLeaderboardRepository).findTopContributors(sinceCaptor.capture(), eq(10));
        assertThat(sinceCaptor.getValue()).isEqualTo(fixedNow.withDayOfMonth(1).toLocalDate().atStartOfDay());
    }

    @Test
    void resolvesFilterCorrectlyForDifferentInputStrings() {
        assertThat(service.getLeaderboard("all").getActiveFilter()).isEqualTo("ALL_TIME");
        assertThat(service.getLeaderboard("Mọi lúc").getActiveFilter()).isEqualTo("ALL_TIME");
        assertThat(service.getLeaderboard("7 ngày qua").getActiveFilter()).isEqualTo("LAST_7_DAYS");
        assertThat(service.getLeaderboard("LAST_7_DAYS").getActiveFilter()).isEqualTo("LAST_7_DAYS");
        assertThat(service.getLeaderboard(null).getActiveFilter()).isEqualTo("THIS_MONTH");
    }
}
