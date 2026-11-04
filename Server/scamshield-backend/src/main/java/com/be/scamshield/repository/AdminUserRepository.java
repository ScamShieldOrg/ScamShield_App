package com.be.scamshield.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AdminUserRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record UserRow(
            Long id,
            String fullName,
            String email,
            String phoneNumber,
            String roleName,
            String status,
            LocalDateTime createdAt,
            LocalDateTime lastLoginAt,
            Integer reputationPoints,
            String reputationRankName,
            Boolean isPhoneVerified,
            long reportCount,
            long openFlagCount
    ) {}

    public List<UserRow> findUsers(
            String search,
            String role,
            String status,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        StringBuilder sql = new StringBuilder("""
                SELECT 
                    u.id,
                    u.full_name,
                    u.email,
                    u.phone_number,
                    r.name AS role_name,
                    u.status,
                    u.created_at,
                    u.last_login_at,
                    u.reputation_points,
                    rr.name AS reputation_rank_name,
                    u.is_phone_verified,
                    COUNT(DISTINCT rep.id) AS report_count,
                    COUNT(DISTINCT CASE WHEN af.status = 'OPEN' THEN af.id END) AS open_flag_count
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id
                LEFT JOIN reputation_ranks rr ON rr.id = u.reputation_rank_id
                LEFT JOIN reports rep ON rep.reporter_user_id = u.id
                LEFT JOIN abuse_flags af ON af.user_id = u.id
                WHERE 1=1
                """);

        applyFilterPredicates(sql, params, search, role, status);

        sql.append("""
                 GROUP BY 
                    u.id, u.full_name, u.email, u.phone_number, r.name, u.status, 
                    u.created_at, u.last_login_at, u.reputation_points, rr.name, u.is_phone_verified
                """);

        applySorting(sql, sortBy, sortDir);

        sql.append(" LIMIT :limit OFFSET :offset");
        params.addValue("limit", size);
        params.addValue("offset", Math.max(0, page - 1) * size);

        return jdbc.query(sql.toString(), params, (rs, rowNum) -> new UserRow(
                rs.getLong("id"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("phone_number"),
                rs.getString("role_name"),
                rs.getString("status"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null,
                rs.getTimestamp("last_login_at") != null ? rs.getTimestamp("last_login_at").toLocalDateTime() : null,
                rs.getObject("reputation_points") != null ? rs.getInt("reputation_points") : 0,
                rs.getString("reputation_rank_name"),
                rs.getBoolean("is_phone_verified"),
                rs.getLong("report_count"),
                rs.getLong("open_flag_count")
        ));
    }

    public long countUsers(String search, String role, String status) {
        MapSqlParameterSource params = new MapSqlParameterSource();
        StringBuilder sql = new StringBuilder("""
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id
                WHERE 1=1
                """);

        applyFilterPredicates(sql, params, search, role, status);

        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count != null ? count : 0L;
    }

    public long countFlaggedAccounts() {
        String sql = """
                SELECT COUNT(DISTINCT u.id)
                FROM users u
                WHERE u.status IN ('SUSPENDED', 'BANNED')
                   OR EXISTS (SELECT 1 FROM abuse_flags af WHERE af.user_id = u.id AND af.status = 'OPEN')
                """;
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource(), Long.class);
        return count != null ? count : 0L;
    }

    public long countTotalAccounts() {
        String sql = "SELECT COUNT(*) FROM users";
        Long count = jdbc.queryForObject(sql, new MapSqlParameterSource(), Long.class);
        return count != null ? count : 0L;
    }

    public Optional<UserRow> findUserDetail(Long userId) {
        String sql = """
                SELECT 
                    u.id,
                    u.full_name,
                    u.email,
                    u.phone_number,
                    r.name AS role_name,
                    u.status,
                    u.created_at,
                    u.last_login_at,
                    u.reputation_points,
                    rr.name AS reputation_rank_name,
                    u.is_phone_verified,
                    COUNT(DISTINCT rep.id) AS report_count,
                    COUNT(DISTINCT CASE WHEN af.status = 'OPEN' THEN af.id END) AS open_flag_count
                FROM users u
                LEFT JOIN roles r ON r.id = u.role_id
                LEFT JOIN reputation_ranks rr ON rr.id = u.reputation_rank_id
                LEFT JOIN reports rep ON rep.reporter_user_id = u.id
                LEFT JOIN abuse_flags af ON af.user_id = u.id
                WHERE u.id = :userId
                GROUP BY 
                    u.id, u.full_name, u.email, u.phone_number, r.name, u.status, 
                    u.created_at, u.last_login_at, u.reputation_points, rr.name, u.is_phone_verified
                """;
        MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);
        List<UserRow> results = jdbc.query(sql, params, (rs, rowNum) -> new UserRow(
                rs.getLong("id"),
                rs.getString("full_name"),
                rs.getString("email"),
                rs.getString("phone_number"),
                rs.getString("role_name"),
                rs.getString("status"),
                rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toLocalDateTime() : null,
                rs.getTimestamp("last_login_at") != null ? rs.getTimestamp("last_login_at").toLocalDateTime() : null,
                rs.getObject("reputation_points") != null ? rs.getInt("reputation_points") : 0,
                rs.getString("reputation_rank_name"),
                rs.getBoolean("is_phone_verified"),
                rs.getLong("report_count"),
                rs.getLong("open_flag_count")
        ));
        return results.stream().findFirst();
    }

    private void applyFilterPredicates(
            StringBuilder sql,
            MapSqlParameterSource params,
            String search,
            String role,
            String status
    ) {
        if (search != null && !search.isBlank()) {
            sql.append("""
                    AND (
                        LOWER(u.full_name) LIKE :searchQuery
                        OR LOWER(u.email) LIKE :searchQuery
                        OR u.phone_number LIKE :searchQuery
                        OR CAST(u.id AS TEXT) LIKE :searchQuery
                        OR LOWER(CONCAT('u-', LPAD(CAST(u.id AS TEXT), 5, '0'))) LIKE :searchQuery
                    )
                    """);
            params.addValue("searchQuery", "%" + search.trim().toLowerCase() + "%");
        }

        if (role != null && !role.isBlank() && !"ALL".equalsIgnoreCase(role)) {
            sql.append(" AND UPPER(r.name) = UPPER(:role)");
            params.addValue("role", role.trim());
        }

        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            if ("FLAGGED".equalsIgnoreCase(status)) {
                sql.append("""
                        AND (
                            u.status IN ('SUSPENDED', 'BANNED')
                            OR EXISTS (SELECT 1 FROM abuse_flags af2 WHERE af2.user_id = u.id AND af2.status = 'OPEN')
                        )
                        """);
            } else {
                sql.append(" AND UPPER(u.status) = UPPER(:status)");
                params.addValue("status", status.trim());
            }
        }
    }

    private void applySorting(StringBuilder sql, String sortBy, String sortDir) {
        String direction = "ASC".equalsIgnoreCase(sortDir) ? "ASC" : "DESC";
        if (sortBy == null) {
            sql.append(" ORDER BY u.created_at ").append(direction).append(", u.id DESC");
            return;
        }

        switch (sortBy.toLowerCase()) {
            case "reports", "reportcount" -> sql.append(" ORDER BY report_count ").append(direction).append(", u.id DESC");
            case "name", "fullname" -> sql.append(" ORDER BY u.full_name ").append(direction).append(", u.id DESC");
            case "id" -> sql.append(" ORDER BY u.id ").append(direction);
            case "status" -> sql.append(" ORDER BY u.status ").append(direction).append(", u.id DESC");
            default -> sql.append(" ORDER BY u.created_at ").append(direction).append(", u.id DESC");
        }
    }
}
