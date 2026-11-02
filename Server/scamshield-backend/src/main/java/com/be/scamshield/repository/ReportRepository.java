package com.be.scamshield.repository;

import com.be.scamshield.entity.Report;
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
                   coalesce(sum(case when upper(r.status) = 'REJECTED' then 1 else 0 end), 0) as rejectedReports,
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
    List<Report> findByIndicatorIdAndStatusIgnoreCase(Long indicatorId, String status);

    List<Report> findByReporterUserIdOrderByCreatedAtDesc(Long reporterUserId);
    long countByReporterUserId(Long reporterUserId);
    long countByReporterUserIdAndCreatedAtAfter(Long reporterUserId, LocalDateTime createdAt);
    long countByReporterUserIdAndStatus(Long reporterUserId, String status);
    Optional<Report> findByIdAndReporterUserId(Long id, Long reporterUserId);

    long countByModerationLockedTrueOrStatusIgnoreCase(String status);
    long countByStatusIgnoreCaseAndModerationLockedFalse(String status);
    long countByStatusIgnoreCase(String status);
}
