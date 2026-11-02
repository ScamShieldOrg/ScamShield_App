package com.be.scamshield.repository;

import com.be.scamshield.dto.response.ScamCheckRiskCountsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Repository
@RequiredArgsConstructor
public class ScamCheckHistoryRepository {

    private final NamedParameterJdbcTemplate jdbc;

    public record RawCheckHistoryItem(
            Long id,
            LocalDateTime createdAt,
            String inputType,
            String rawInput,
            String normalizedInput,
            String maskedInput,
            String inputHash,
            String indicatorType,
            String indicatorValue,
            String indicatorDisplay,
            String categoryName,
            String categoryCode,
            String partnerBrand,
            String verdictStatus,
            String verdictLabel,
            Integer riskScore,
            boolean isRetroactive
    ) {}

    private static final String BASE_CTE = """
            WITH ranked_checks AS (
                SELECT 
                    cr.id,
                    cr.created_at,
                    cr.input_type,
                    cr.raw_input,
                    cr.normalized_input,
                    cr.masked_input,
                    cr.input_hash,
                    COALESCE(matched_i.type, i.type) AS indicator_type,
                    COALESCE(matched_i.normalized_value, i.normalized_value) AS indicator_value,
                    COALESCE(matched_i.display_value, i.display_value) AS indicator_display,
                    CASE WHEN cv.id IS NOT NULL THEN sc_v.name
                         ELSE COALESCE(sc_ci.name, sc_r.name, pp.brand_name) END AS category_name,
                    CASE WHEN cv.id IS NOT NULL THEN sc_v.code
                         ELSE COALESCE(sc_ci.code, sc_r.code) END AS category_code,
                    cv.verdict AS saved_verdict,
                    cv.risk_score AS saved_risk_score,
                    pp.brand_name AS partner_brand,
                    ci.confirmed_at AS confirmed_at,
                    we.id AS whitelist_id,
                    ci.id AS confirmed_id,
                    r.id AS report_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY cr.id 
                        ORDER BY 
                            CASE WHEN cv.matched_indicator_id = i.id THEN 0
                                 WHEN ci.id IS NOT NULL THEN 1 WHEN we.id IS NOT NULL THEN 2 WHEN r.id IS NOT NULL THEN 3 ELSE 4 END,
                            ei.id ASC
                    ) AS rn
                FROM check_requests cr
                LEFT JOIN check_verdicts cv ON cv.check_request_id = cr.id
                LEFT JOIN indicators matched_i ON matched_i.id = cv.matched_indicator_id
                LEFT JOIN scam_categories sc_v ON sc_v.id = cv.primary_category_id
                LEFT JOIN extracted_iocs ei ON ei.check_request_id = cr.id
                LEFT JOIN indicators i ON i.id = ei.indicator_id
                LEFT JOIN whitelist_entries we ON we.indicator_id = i.id AND we.verification_status = 'VERIFIED'
                LEFT JOIN partner_profiles pp ON pp.id = we.partner_id
                LEFT JOIN confirmed_indicators ci ON ci.indicator_id = i.id AND ci.status = 'ACTIVE' AND ci.retracted_at IS NULL
                LEFT JOIN scam_categories sc_ci ON sc_ci.id = ci.category_id
                LEFT JOIN reports r ON r.indicator_id = i.id
                LEFT JOIN scam_categories sc_r ON sc_r.id = r.category_id
                WHERE cr.user_id = :userId 
                  AND (cr.status IS NULL OR cr.status <> 'DELETED')
                  AND (cr.retention_expires_at IS NULL OR cr.retention_expires_at > CURRENT_TIMESTAMP)
            ),
            deduped_checks AS (
                SELECT 
                    id,
                    created_at,
                    input_type,
                    raw_input,
                    normalized_input,
                    masked_input,
                    input_hash,
                    indicator_type,
                    indicator_value,
                    indicator_display,
                    category_name,
                    category_code,
                    partner_brand,
                    confirmed_at,
                    CASE
                        WHEN saved_verdict = 'SCAM_RISK' THEN 'DANGEROUS'
                        WHEN saved_verdict = 'LOW_RISK' THEN 'SAFE'
                        WHEN saved_verdict = 'SUSPICIOUS' THEN 'SUSPICIOUS'
                        WHEN saved_verdict IS NOT NULL THEN 'UNKNOWN'
                        WHEN whitelist_id IS NOT NULL THEN 'SAFE'
                        WHEN confirmed_id IS NOT NULL THEN 'DANGEROUS'
                        WHEN report_id IS NOT NULL THEN 'SUSPICIOUS'
                        ELSE 'UNKNOWN'
                    END AS verdict_status,
                    CASE
                        WHEN saved_verdict = 'SCAM_RISK' THEN 'Lừa Đảo Nguy Cơ Cao'
                        WHEN saved_verdict = 'LOW_RISK' THEN 'Rủi Ro Thấp'
                        WHEN saved_verdict = 'SUSPICIOUS' THEN 'Nghi Vấn Rủi Ro'
                        WHEN saved_verdict IS NOT NULL THEN 'Chưa Đủ Dữ Liệu'
                        WHEN whitelist_id IS NOT NULL THEN 'An Toàn Chính Hãng'
                        WHEN confirmed_id IS NOT NULL THEN 'Lừa Đảo Nguy Cơ Cao'
                        WHEN report_id IS NOT NULL THEN 'Nghi Vấn Rủi Ro'
                        ELSE 'Chưa Đủ Dữ Liệu'
                    END AS verdict_label,
                    CASE
                        WHEN saved_verdict IS NOT NULL AND saved_risk_score IS NOT NULL
                            THEN CAST(saved_risk_score AS INTEGER)
                        WHEN saved_verdict IS NOT NULL THEN NULL
                        WHEN whitelist_id IS NOT NULL THEN 3
                        WHEN confirmed_id IS NOT NULL THEN 98
                        WHEN report_id IS NOT NULL THEN 68
                        ELSE 15
                    END AS risk_score,
                    (saved_verdict IS NULL AND confirmed_id IS NOT NULL AND confirmed_at > created_at) AS is_retroactive
                FROM ranked_checks
                WHERE rn = 1
            )
            """;

    public ScamCheckRiskCountsResponse getRiskCounts(Long userId) {
        String sql = BASE_CTE + """
                SELECT 
                    COUNT(*) AS total_count,
                    COALESCE(SUM(CASE WHEN verdict_status = 'DANGEROUS' THEN 1 ELSE 0 END), 0) AS dangerous_count,
                    COALESCE(SUM(CASE WHEN verdict_status = 'SUSPICIOUS' THEN 1 ELSE 0 END), 0) AS suspicious_count,
                    COALESCE(SUM(CASE WHEN verdict_status = 'SAFE' THEN 1 ELSE 0 END), 0) AS safe_count,
                    COALESCE(SUM(CASE WHEN verdict_status = 'UNKNOWN' THEN 1 ELSE 0 END), 0) AS unknown_count
                FROM deduped_checks
                """;

        MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);
        return jdbc.queryForObject(sql, params, (rs, rowNum) -> ScamCheckRiskCountsResponse.builder()
                .all(rs.getLong("total_count"))
                .dangerous(rs.getLong("dangerous_count"))
                .suspicious(rs.getLong("suspicious_count"))
                .safe(rs.getLong("safe_count"))
                .unknown(rs.getLong("unknown_count"))
                .build());
    }

    public long countFilteredHistory(Long userId, String search, String timeRange, String scamType, String riskStatus, LocalDateTime now) {
        StringBuilder sql = new StringBuilder(BASE_CTE);
        sql.append("SELECT COUNT(*) FROM deduped_checks WHERE 1=1 ");

        MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);
        appendFilters(sql, params, search, timeRange, scamType, riskStatus, now);

        Long count = jdbc.queryForObject(sql.toString(), params, Long.class);
        return count != null ? count : 0L;
    }

    public List<RawCheckHistoryItem> findFilteredHistory(
            Long userId,
            String search,
            String timeRange,
            String scamType,
            String riskStatus,
            LocalDateTime now,
            int limit,
            long offset) {

        StringBuilder sql = new StringBuilder(BASE_CTE);
        sql.append("SELECT * FROM deduped_checks WHERE 1=1 ");

        MapSqlParameterSource params = new MapSqlParameterSource("userId", userId);
        appendFilters(sql, params, search, timeRange, scamType, riskStatus, now);

        sql.append(" ORDER BY created_at DESC LIMIT :limit OFFSET :offset");
        params.addValue("limit", limit);
        params.addValue("offset", offset);

        return jdbc.query(sql.toString(), params, this::mapRow);
    }

    private void appendFilters(
            StringBuilder sql,
            MapSqlParameterSource params,
            String search,
            String timeRange,
            String scamType,
            String riskStatus,
            LocalDateTime now) {

        if (riskStatus != null && !riskStatus.isBlank() && !"ALL".equalsIgnoreCase(riskStatus.trim())) {
            sql.append(" AND verdict_status = :riskStatus");
            params.addValue("riskStatus", riskStatus.trim().toUpperCase(Locale.ROOT));
        }

        if (search != null && !search.isBlank()) {
            sql.append(" AND (LOWER(COALESCE(raw_input, '')) LIKE :searchPattern "
                    + "OR LOWER(COALESCE(normalized_input, '')) LIKE :searchPattern "
                    + "OR LOWER(COALESCE(indicator_value, '')) LIKE :searchPattern "
                    + "OR LOWER(COALESCE(indicator_display, '')) LIKE :searchPattern "
                    + "OR LOWER(COALESCE(category_name, '')) LIKE :searchPattern) ");
            params.addValue("searchPattern", "%" + search.trim().toLowerCase(Locale.ROOT) + "%");
        }

        if (timeRange != null && !timeRange.isBlank() && !"all".equalsIgnoreCase(timeRange.trim())) {
            String range = timeRange.trim().toLowerCase(Locale.ROOT);
            LocalDateTime since = null;
            if ("7_days".equals(range) || "7".equals(range)) {
                since = now.minusDays(7);
            } else if ("30_days".equals(range) || "30".equals(range)) {
                since = now.minusDays(30);
            } else if ("90_days".equals(range) || "90".equals(range)) {
                since = now.minusDays(90);
            }
            if (since != null) {
                sql.append(" AND created_at >= :sinceTime");
                params.addValue("sinceTime", since);
            }
        }

        if (scamType != null && !scamType.isBlank() && !"all".equalsIgnoreCase(scamType.trim())) {
            String typeLower = scamType.trim().toLowerCase(Locale.ROOT);
            if ("telecom".equals(typeLower)) {
                sql.append(" AND (LOWER(COALESCE(category_name, '')) LIKE '%viễn thông%' OR LOWER(COALESCE(category_code, '')) LIKE '%vien_thong%')");
            } else if ("malware".equals(typeLower)) {
                sql.append(" AND (LOWER(COALESCE(category_name, '')) LIKE '%malware%' "
                        + "OR LOWER(COALESCE(category_name, '')) LIKE '%vneid%' "
                        + "OR LOWER(COALESCE(category_name, '')) LIKE '%mã độc%')");
            } else if ("banking".equals(typeLower)) {
                sql.append(" AND (LOWER(COALESCE(category_name, '')) LIKE '%ngân hàng%' "
                        + "OR LOWER(COALESCE(category_name, '')) LIKE '%tài chính%')");
            } else if ("forex".equals(typeLower)) {
                sql.append(" AND (LOWER(COALESCE(category_name, '')) LIKE '%forex%' "
                        + "OR LOWER(COALESCE(category_name, '')) LIKE '%tiền ảo%')");
            } else {
                sql.append(" AND (LOWER(COALESCE(category_name, '')) LIKE :typePattern OR LOWER(COALESCE(category_code, '')) LIKE :typePattern)");
                params.addValue("typePattern", "%" + typeLower + "%");
            }
        }
    }

    private RawCheckHistoryItem mapRow(ResultSet rs, int rowNum) throws SQLException {
        java.sql.Timestamp ts = rs.getTimestamp("created_at");
        LocalDateTime createdAt = ts != null ? ts.toLocalDateTime() : null;

        return new RawCheckHistoryItem(
                rs.getLong("id"),
                createdAt,
                rs.getString("input_type"),
                rs.getString("raw_input"),
                rs.getString("normalized_input"),
                rs.getString("masked_input"),
                rs.getString("input_hash"),
                rs.getString("indicator_type"),
                rs.getString("indicator_value"),
                rs.getString("indicator_display"),
                rs.getString("category_name"),
                rs.getString("category_code"),
                rs.getString("partner_brand"),
                rs.getString("verdict_status"),
                rs.getString("verdict_label"),
                rs.getObject("risk_score", Integer.class),
                rs.getBoolean("is_retroactive")
        );
    }
}
