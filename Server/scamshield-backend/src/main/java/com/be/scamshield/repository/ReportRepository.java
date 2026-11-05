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
