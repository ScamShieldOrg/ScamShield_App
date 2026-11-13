package com.be.scamshield.repository;

import com.be.scamshield.entity.Report;
import com.be.scamshield.constant.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long>, JpaSpecificationExecutor<Report> {

    interface ReviewStats {
        String getBlacklistStatus();
        long getIndicatorReports();
        long getIndicatorApprovedReports();
        long getIndicatorRejectedReports();
        long getIndicatorDisputes();
        long getReporterReports();
        long getApprovedReports();
        long getDecidedReports();
        long getReporterDisputes();
        long getApprovedDisputes();
        long getDecidedDisputes();
        long getAbuseFlags();
        long getOpenFlags();
    }

    @Query(value = """
            SELECT ci.status AS "blacklistStatus",
                   ir.total AS "indicatorReports", ir.approved AS "indicatorApprovedReports",
                   ir.rejected AS "indicatorRejectedReports",
                   (SELECT count(*) FROM disputes d WHERE d.confirmed_indicator_id = ci.id AND d.status <> 'DRAFT') AS "indicatorDisputes",
                   rr.total AS "reporterReports", rr.approved AS "approvedReports", rr.decided AS "decidedReports",
                   rd.total AS "reporterDisputes", rd.approved AS "approvedDisputes", rd.decided AS "decidedDisputes",
                   af.total AS "abuseFlags", af.open_count AS "openFlags"
            FROM reports source
            LEFT JOIN confirmed_indicators ci ON ci.indicator_id = source.indicator_id
            CROSS JOIN LATERAL (
                SELECT count(*) AS total, count(*) FILTER (WHERE status = 'APPROVED') AS approved,
                       count(*) FILTER (WHERE status = 'REJECTED') AS rejected
                FROM reports WHERE indicator_id = source.indicator_id
            ) ir
            CROSS JOIN LATERAL (
                SELECT count(*) AS total, count(*) FILTER (WHERE status = 'APPROVED') AS approved,
                       count(*) FILTER (WHERE status IN ('APPROVED', 'REJECTED')) AS decided
                FROM reports WHERE reporter_user_id = source.reporter_user_id
            ) rr
            CROSS JOIN LATERAL (
                SELECT count(*) AS total, count(*) FILTER (WHERE status = 'APPROVED') AS approved,
                       count(*) FILTER (WHERE status IN ('APPROVED', 'REJECTED')) AS decided
                FROM disputes WHERE submitted_by_user_id = source.reporter_user_id AND status <> 'DRAFT'
            ) rd
            CROSS JOIN LATERAL (
                SELECT count(*) AS total, count(*) FILTER (WHERE status = 'OPEN') AS open_count
                FROM abuse_flags WHERE user_id = source.reporter_user_id
            ) af
            WHERE source.id = :reportId
            """, nativeQuery = true)
    Optional<ReviewStats> findReviewStats(@Param("reportId") Long reportId);

    List<Report> findByReporterUserIdAndIdIn(Long userId, List<Long> reportIds);

    interface AbuseReportActivity {
        long getTotalReports();
        long getRejectedReports();
        long getDistinctIndicators();
    }

    @Query("""
            select count(r) as totalReports,
                   coalesce(sum(case when r.status = com.be.scamshield.constant.ReportStatus.REJECTED then 1 else 0 end), 0) as rejectedReports,
                   count(distinct r.indicator.id) as distinctIndicators
            from Report r
            where r.reporterUser.id = :userId and r.createdAt >= :windowStart and r.createdAt <= :windowEnd
            """)
    AbuseReportActivity getAbuseReportActivity(@Param("userId") Long userId,
            @Param("windowStart") LocalDateTime windowStart, @Param("windowEnd") LocalDateTime windowEnd);

    @Override
    @EntityGraph(attributePaths = {"indicator", "category", "reporterUser"})
    Page<Report> findAll(Specification<Report> spec, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"indicator", "category", "reporterUser"})
    Optional<Report> findById(Long id);

    @EntityGraph(attributePaths = {"indicator", "category", "reporterUser"})
    List<Report> findByIndicatorIdAndStatus(Long indicatorId, ReportStatus status);

    List<Report> findByReporterUserIdOrderByCreatedAtDesc(Long reporterUserId);
    long countByReporterUserId(Long reporterUserId);
    long countByReporterUserIdAndCreatedAtAfter(Long reporterUserId, LocalDateTime createdAt);
    long countByReporterUserIdAndStatus(Long reporterUserId, ReportStatus status);
    Optional<Report> findByIdAndReporterUserId(Long id, Long reporterUserId);

    long countByStatus(ReportStatus status);

    @Query("select r from Report r where r.status in (com.be.scamshield.constant.ReportStatus.PENDING, com.be.scamshield.constant.ReportStatus.IN_REVIEW) order by r.id")
    List<Report> findPendingReportsForAssignment();

    @Query("""
            select count(r) from Report r
            where r.status = :status and exists (
                select a.id from ModerationAction a
                where a.report = r and a.action = 'IN_REVIEW'
            )
            """)
    long countStartedReviewsByStatus(@Param("status") ReportStatus status);
}
