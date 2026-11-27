package com.be.scamshield.repository;

import com.be.scamshield.entity.ConfirmedIndicator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResourceRepository extends JpaRepository<ConfirmedIndicator, Long> {

    @Query(value = """
            SELECT ci.id AS id,
                   i.id AS indicatorId,
                   cast(i.type as string) AS resourceType,
                   COALESCE(i.displayValue, i.normalizedValue) AS title,
                   ci.publicReason AS description,
                   source.id AS sourceReportId,
                   source.description AS sourceReportDescription,
                   source.createdAt AS sourceReportCreatedAt,
                   sourceCategory.name AS sourceReportCategoryName,
                   sc.code AS categoryCode,
                   sc.name AS categoryName,
                   sc.description AS categoryDescription,
                   (SELECT COUNT(r)
                      FROM Report r
                     WHERE r.indicator = i
                       AND r.status = com.be.scamshield.constant.ReportStatus.APPROVED) AS warningCount,
                   (SELECT COUNT(e)
                      FROM ReportEvidence e
                     WHERE e.report = ci.sourceReport
                       AND e.report.status = com.be.scamshield.constant.ReportStatus.APPROVED
                       AND e.publicImageObjectKey IS NOT NULL) AS publicImageCount,
                   ci.confirmedAt AS confirmedAt,
                   COALESCE(i.updatedAt, ci.confirmedAt) AS updatedAt
            FROM ConfirmedIndicator ci
            JOIN ci.indicator i
            LEFT JOIN ci.category sc
            LEFT JOIN ci.sourceReport source ON source.status = com.be.scamshield.constant.ReportStatus.APPROVED
            LEFT JOIN source.category sourceCategory
            WHERE ci.status = com.be.scamshield.constant.ConfirmedIndicatorStatus.ACTIVE
              AND (:resourceType IS NULL OR cast(i.type as string) = :resourceType)
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
                    WHERE ci.status = com.be.scamshield.constant.ConfirmedIndicatorStatus.ACTIVE
                      AND (:resourceType IS NULL OR cast(i.type as string) = :resourceType)
                      AND (:keyword IS NULL
                           OR LOWER(COALESCE(i.displayValue, '')) LIKE :keyword
                           OR LOWER(i.normalizedValue) LIKE :keyword
                           OR LOWER(COALESCE(ci.publicReason, '')) LIKE :keyword)
                    """)
    Page<BlacklistResourceProjection> findBlackListResources(
            @Param("keyword") String keyword,
            @Param("resourceType") String resourceType,
            Pageable pageable);

    @Query("""
            SELECT e.publicImageObjectKey
              FROM ConfirmedIndicator ci, ReportEvidence e
             WHERE ci.id = :id
               AND ci.status = com.be.scamshield.constant.ConfirmedIndicatorStatus.ACTIVE
               AND e.report = ci.sourceReport
               AND e.report.status = com.be.scamshield.constant.ReportStatus.APPROVED
               AND e.publicImageObjectKey IS NOT NULL
             ORDER BY e.id
            """)
    List<String> findBlackListImageKeys(@Param("id") Long id);

    default Optional<String> findBlackListImageKey(Long id) {
        return findBlackListImageKeys(id).stream().findFirst();
    }


    interface PublicEvidenceRow {
        Long getBlacklistId();
        String getObjectKey();
    }

    @Query("""
            SELECT ci.id AS blacklistId, e.publicImageObjectKey AS objectKey
            FROM ConfirmedIndicator ci, ReportEvidence e
            WHERE ci.id IN (:ids)
              AND ci.status = com.be.scamshield.constant.ConfirmedIndicatorStatus.ACTIVE
              AND e.report = ci.sourceReport
              AND e.report.status = com.be.scamshield.constant.ReportStatus.APPROVED
              AND e.publicImageObjectKey IS NOT NULL
            ORDER BY ci.id, e.id
            """)
    List<PublicEvidenceRow> findPublicEvidenceForBlacklistIds(@Param("ids") List<Long> ids);

    interface BlacklistResourceProjection {
        Long getSourceReportId();
        String getSourceReportDescription();
        String getSourceReportCategoryName();
        LocalDateTime getSourceReportCreatedAt();
        Long getPublicImageCount();
        Long getId();
        Long getIndicatorId();
        String getResourceType();
        String getTitle();
        String getDescription();
        String getCategoryCode();
        String getCategoryName();
        String getCategoryDescription();
        Long getWarningCount();
        LocalDateTime getConfirmedAt();
        LocalDateTime getUpdatedAt();
    }
}
