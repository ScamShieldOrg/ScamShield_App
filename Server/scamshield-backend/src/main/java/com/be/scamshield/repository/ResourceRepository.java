package com.be.scamshield.repository;

import com.be.scamshield.entity.ConfirmedIndicator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface ResourceRepository extends JpaRepository<ConfirmedIndicator, Long> {

    @Query(value = """
            SELECT ci.id AS id,
                   i.id AS indicatorId,
                   i.type AS resourceType,
                   COALESCE(i.displayValue, i.normalizedValue) AS title,
                   ci.publicReason AS description,
                   (SELECT COUNT(r)
                      FROM Report r
                     WHERE r.indicator = i
                       AND r.status IN ('APPROVED', 'MERGED')) AS warningCount,
                   ci.confirmedAt AS confirmedAt,
                   COALESCE(i.updatedAt, ci.confirmedAt) AS updatedAt
            FROM ConfirmedIndicator ci
            JOIN ci.indicator i
            WHERE ci.status = 'ACTIVE'
              AND (:resourceType IS NULL OR i.type = :resourceType)
              AND (:keyword IS NULL
                   OR LOWER(COALESCE(i.displayValue, '')) LIKE :keyword
                   OR LOWER(i.normalizedValue) LIKE :keyword
                   OR LOWER(COALESCE(ci.publicReason, '')) LIKE :keyword)
            ORDER BY ci.confirmedAt DESC, ci.id DESC
            """,
            countQuery = """
                    SELECT COUNT(ci)
                    FROM ConfirmedIndicator ci
                    JOIN ci.indicator i
                    WHERE ci.status = 'ACTIVE'
                      AND (:resourceType IS NULL OR i.type = :resourceType)
                      AND (:keyword IS NULL
                           OR LOWER(COALESCE(i.displayValue, '')) LIKE :keyword
                           OR LOWER(i.normalizedValue) LIKE :keyword
                           OR LOWER(COALESCE(ci.publicReason, '')) LIKE :keyword)
                    """)
    Page<BlacklistResourceProjection> findBlackListResources(
            @Param("keyword") String keyword,
            @Param("resourceType") String resourceType,
            Pageable pageable);

    interface BlacklistResourceProjection {
        Long getId();
        Long getIndicatorId();
        String getResourceType();
        String getTitle();
        String getDescription();
        Long getWarningCount();
        LocalDateTime getConfirmedAt();
        LocalDateTime getUpdatedAt();
    }
}
