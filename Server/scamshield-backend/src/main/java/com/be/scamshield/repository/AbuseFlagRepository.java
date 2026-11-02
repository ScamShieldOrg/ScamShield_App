package com.be.scamshield.repository;

import com.be.scamshield.entity.AbuseFlag;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface AbuseFlagRepository extends JpaRepository<AbuseFlag, Long>, JpaSpecificationExecutor<AbuseFlag> {

    @Query("select f.user.id from AbuseFlag f where f.id = :id and f.user is not null")
    Optional<Long> findTargetUserId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select f from AbuseFlag f where f.id = :id")
    Optional<AbuseFlag> findByIdForUpdate(@Param("id") Long id);

    @Override
    @EntityGraph(attributePaths = {"user", "createdBy", "report"})
    Page<AbuseFlag> findAll(Specification<AbuseFlag> spec, Pageable pageable);

    @EntityGraph(attributePaths = {"user", "createdBy", "report", "report.indicator", "report.category",
            "report.reporterUser", "relatedReports", "relatedReports.indicator", "relatedReports.category",
            "relatedReports.reporterUser"})
    Optional<AbuseFlag> findByIdAndUserIsNotNullAndStatusIn(Long id, Collection<String> statuses);

    List<AbuseFlag> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<AbuseFlag> findByUserIdAndStatus(Long userId, String status);

    long countByStatus(String status);

    boolean existsByUserIdAndStatus(Long userId, String status);

    @EntityGraph(attributePaths = {"report", "createdBy"})
    Page<AbuseFlag> findByUserIdAndStatusIn(Long userId, Collection<String> statuses, Pageable pageable);

}
