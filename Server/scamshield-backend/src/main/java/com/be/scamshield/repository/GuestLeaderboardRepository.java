package com.be.scamshield.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class GuestLeaderboardRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record UserContribution(
            Long userId,
            String fullName,
            int reputationPoints,
            String rankName,
            long reportCount
    ) {}

    public long countActiveUsers() {
        String sql = "SELECT COUNT(*) FROM users WHERE status = 'ACTIVE'";
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource(), Long.class);
        return count != null ? count : 0L;
    }

    public long countNewUsersSince(LocalDateTime since) {
        String sql = "SELECT COUNT(*) FROM users WHERE status = 'ACTIVE' AND created_at >= :since";
        MapSqlParameterSource params = new MapSqlParameterSource("since", since);
        Long count = jdbc.queryForObject(sql, params, Long.class);
        return count != null ? count : 0L;
    }

    public long countNeutralizedThreats() {
        String sql = "SELECT COUNT(*) FROM confirmed_indicators WHERE status = 'ACTIVE' AND retracted_at IS NULL";
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource(), Long.class);
        return count != null ? count : 0L;
    }

    public List<UserContribution> findTopContributors(LocalDateTime since, int limit) {
        MapSqlParameterSource params = new MapSqlParameterSource("limit", limit);
        String reportJoin;
        String orderBy;
        if (since != null) {
            reportJoin = "LEFT JOIN reports rep ON rep.reporter_user_id = u.id AND rep.created_at >= :since";
            orderBy = "COUNT(rep.id) DESC, u.reputation_points DESC, u.id ASC";
            params.addValue("since", since);
        } else {
            reportJoin = "LEFT JOIN reports rep ON rep.reporter_user_id = u.id";
            orderBy = "u.reputation_points DESC, COUNT(rep.id) DESC, u.id ASC";
        }

        String sql = """
                SELECT
                    u.id AS user_id,
                    u.full_name AS full_name,
                    u.reputation_points AS reputation_points,
                    r.name AS rank_name,
                    COUNT(rep.id) AS report_count
                FROM users u
                LEFT JOIN reputation_ranks r ON r.id = u.reputation_rank_id
                """ + reportJoin + "\n" + """
                WHERE u.status = 'ACTIVE'
                GROUP BY u.id, u.full_name, u.reputation_points, r.name
                ORDER BY """ + " " + orderBy + "\n" + """
                LIMIT :limit
                """;
        return jdbc.query(sql, params, (rs, rowNum) -> new UserContribution(
                rs.getLong("user_id"),
                rs.getString("full_name"),
                rs.getInt("reputation_points"),
                rs.getString("rank_name"),
                rs.getLong("report_count")
        ));
    }

    public List<UserContribution> findTopContributors(int limit) {
        return findTopContributors(null, limit);
    }
}
