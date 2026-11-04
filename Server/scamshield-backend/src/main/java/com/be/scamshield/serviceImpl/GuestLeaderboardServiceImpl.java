package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.response.*;
import com.be.scamshield.repository.GuestLeaderboardRepository;
import com.be.scamshield.repository.GuestLeaderboardRepository.UserContribution;
import com.be.scamshield.service.IGuestLeaderboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.NumberFormat;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class GuestLeaderboardServiceImpl implements IGuestLeaderboardService {

    private final GuestLeaderboardRepository guestLeaderboardRepository;
    private final Clock applicationClock;

    @Override
    @Transactional(readOnly = true)
    public GuestLeaderboardResponse getLeaderboard(String timeRange) {
        LocalDateTime now = LocalDateTime.now(applicationClock);
        String resolvedFilter = resolveFilter(timeRange);
        LocalDateTime since = resolveSince(resolvedFilter, now);

        List<UserContribution> contributors = guestLeaderboardRepository.findTopContributors(since, 10);
        NumberFormat formatter = NumberFormat.getNumberInstance(Locale.US);

        List<LeaderboardStatCardResponse> stats = buildStatsCards(now, formatter);
        LeaderboardTopThreeResponse topThree = buildTopThree(contributors, since, formatter);
        List<LeaderboardRankingItemResponse> rankings = buildRankings(contributors, since, formatter);
        List<LeaderboardFilterOptionResponse> filters = buildFilterOptions(now, resolvedFilter);

        return GuestLeaderboardResponse.builder()
                .stats(stats)
                .topThree(topThree)
                .rankings(rankings)
                .filters(filters)
                .activeFilter(resolvedFilter)
                .build();
    }

    private String resolveFilter(String timeRange) {
        if (timeRange == null || timeRange.isBlank()) {
            return "THIS_MONTH";
        }
        String lower = timeRange.trim().toLowerCase(Locale.ROOT);
        if (lower.contains("all") || lower.contains("mọi")) {
            return "ALL_TIME";
        }
        if (lower.contains("7") || lower.contains("week") || lower.contains("tuần")) {
            return "LAST_7_DAYS";
        }
        return "THIS_MONTH";
    }

    private LocalDateTime resolveSince(String resolvedFilter, LocalDateTime now) {
        if ("ALL_TIME".equalsIgnoreCase(resolvedFilter)) {
            return null;
        }
        if ("LAST_7_DAYS".equalsIgnoreCase(resolvedFilter)) {
            return now.minusDays(7);
        }
        return now.withDayOfMonth(1).toLocalDate().atStartOfDay();
    }

    private List<LeaderboardFilterOptionResponse> buildFilterOptions(LocalDateTime now, String activeFilter) {
        String monthLabel = String.format("Tháng %02d/%d", now.getMonthValue(), now.getYear());

        return List.of(
                LeaderboardFilterOptionResponse.builder()
                        .id("ALL_TIME")
                        .label("Mọi lúc")
                        .active("ALL_TIME".equalsIgnoreCase(activeFilter))
                        .build(),
                LeaderboardFilterOptionResponse.builder()
                        .id("THIS_MONTH")
                        .label(monthLabel)
                        .active("THIS_MONTH".equalsIgnoreCase(activeFilter))
                        .build(),
                LeaderboardFilterOptionResponse.builder()
                        .id("LAST_7_DAYS")
                        .label("7 ngày qua")
                        .active("LAST_7_DAYS".equalsIgnoreCase(activeFilter))
                        .build()
        );
    }

    private List<LeaderboardStatCardResponse> buildStatsCards(LocalDateTime now, NumberFormat formatter) {
        long activeDbUsers = 0;
        long newUsersWeek = 0;
        long neutralizedDbThreats = 0;

        try {
            activeDbUsers = guestLeaderboardRepository.countActiveUsers();
            newUsersWeek = guestLeaderboardRepository.countNewUsersSince(now.minusDays(7));
            neutralizedDbThreats = guestLeaderboardRepository.countNeutralizedThreats();
        } catch (Exception ignored) {
            // Safely handle errors if tables are empty
        }

        long totalExperts = activeDbUsers;
        long totalThreats = neutralizedDbThreats;
        long weekGain = newUsersWeek;

        return List.of(
                LeaderboardStatCardResponse.builder()
                        .key("ACTIVE_EXPERTS")
                        .label("CHUYÊN GIA KÍCH HOẠT")
                        .value(formatter.format(totalExperts))
                        .rawValue(totalExperts)
                        .sub("+" + weekGain + " chuyên gia tuần này")
                        .icon("UserFocus")
                        .build(),
                LeaderboardStatCardResponse.builder()
                        .key("THREATS_NEUTRALIZED")
                        .label("MỐI ĐE DỌA VÔ HIỆU HÓA")
                        .value(formatter.format(totalThreats))
                        .rawValue(totalThreats)
                        .sub("Báo cáo A05 & NCSC")
                        .icon("ShieldCheck")
                        .build()
        );
    }

    private LeaderboardTopThreeResponse buildTopThree(
            List<UserContribution> contributors,
            LocalDateTime since,
            NumberFormat formatter
    ) {
        LeaderboardPodiumItemResponse rank1 = null;
        LeaderboardPodiumItemResponse rank2 = null;
        LeaderboardPodiumItemResponse rank3 = null;

        if (contributors != null && contributors.size() >= 1) {
            rank1 = buildPodiumItem(contributors.get(0), 1, since, formatter);
        }
        if (contributors != null && contributors.size() >= 2) {
            rank2 = buildPodiumItem(contributors.get(1), 2, since, formatter);
        }
        if (contributors != null && contributors.size() >= 3) {
            rank3 = buildPodiumItem(contributors.get(2), 3, since, formatter);
        }

        return LeaderboardTopThreeResponse.builder()
                .rank1(rank1)
                .rank2(rank2)
                .rank3(rank3)
                .build();
    }

    private LeaderboardPodiumItemResponse buildPodiumItem(
            UserContribution contrib,
            int rank,
            LocalDateTime since,
            NumberFormat formatter
    ) {
        long score = calculateScore(contrib, since);
        String anonName = anonymizeUser(contrib.userId(), rank);
        String avatar = resolveAvatar(anonName);
        String tier = resolveRankTier(contrib.rankName(), rank);

        String badge = rank == 1 ? "HẠNG NHẤT TOÀN QUỐC" : null;
        String subtitle = rank == 1 ? "Định danh xác thực cấp cao"
                : (rank == 2 ? "Khu vực: VN-North (Ẩn danh)" : "Khu vực: VN-South (Ẩn danh)");
        String footerLeft = rank == 1 ? "An toàn tuyệt đối (Zero PII)" : "Mã hóa PII";
        String footerRight = rank == 1 ? "#VN-01" : (rank == 2 ? "Top 0.05%" : "Top 0.1%");

        return LeaderboardPodiumItemResponse.builder()
                .rank(rank)
                .anonymousIdentifier(anonName)
                .badge(badge)
                .subtitle(subtitle)
                .footerLeft(footerLeft)
                .footerRight(footerRight)
                .avatar(avatar)
                .rankClass(tier)
                .rankTier(tier)
                .contributions(score)
                .contributionsFormatted(formatter.format(score))
                .accuracy(null)
                .build();
    }

    private List<LeaderboardRankingItemResponse> buildRankings(
            List<UserContribution> contributors,
            LocalDateTime since,
            NumberFormat formatter
    ) {
        if (contributors == null || contributors.size() <= 3) {
            return List.of();
        }

        List<LeaderboardRankingItemResponse> rankings = new ArrayList<>();
        int max = Math.min(contributors.size(), 10);
        for (int i = 3; i < max; i++) {
            UserContribution contrib = contributors.get(i);
            int rankNum = i + 1;
            long score = calculateScore(contrib, since);
            String anonName = anonymizeUser(contrib.userId(), rankNum);
            String avatar = resolveAvatar(anonName);
            String tier = resolveRankTier(contrib.rankName(), rankNum);

            rankings.add(LeaderboardRankingItemResponse.builder()
                    .rank(String.format("%02d", rankNum))
                    .rankNumber(rankNum)
                    .avatar(avatar)
                    .name(anonName)
                    .rankClass(tier)
                    .rankTier(tier)
                    .score(formatter.format(score))
                    .rawScore(score)
                    .acc(null)
                    .accuracy(null)
                    .build());
        }
        return rankings;
    }

    private long calculateScore(UserContribution contrib, LocalDateTime since) {
        if (since != null) {
            return contrib.reportCount();
        }
        return contrib.reputationPoints() > 0 ? (long) contrib.reputationPoints() : contrib.reportCount();
    }

    private String anonymizeUser(Long userId, int rank) {
        if (userId == null) {
            return "User_#0000";
        }
        String prefix;
        if (rank == 1) {
            prefix = "Hunter_#";
        } else if (rank == 2) {
            prefix = "Sentinel_#";
        } else if (rank == 3) {
            prefix = "Member_#";
        } else if (rank % 3 == 0) {
            prefix = "Member_#";
        } else if (rank % 2 == 0) {
            prefix = "Sentinel_#";
        } else {
            prefix = "User_****";
        }

        if (prefix.endsWith("****")) {
            return prefix + String.format("%02d", Math.abs(userId % 100));
        } else {
            long displayNum = userId < 1000 ? userId + 1000 : userId;
            return prefix + displayNum;
        }
    }

    private String resolveAvatar(String anonymousName) {
        if (anonymousName == null || anonymousName.isEmpty()) {
            return "U0";
        }
        char firstChar = anonymousName.charAt(0);
        char lastChar = anonymousName.charAt(anonymousName.length() - 1);
        return "" + firstChar + (Character.isDigit(lastChar) ? lastChar : "1");
    }

    private String resolveRankTier(String dbRankName, int rank) {
        if (dbRankName != null && !dbRankName.isBlank()) {
            return dbRankName;
        }
        return rank <= 5 ? "HỘ VỆ BẠCH KIM" : "XÁC THỰC VÀNG";
    }
}
