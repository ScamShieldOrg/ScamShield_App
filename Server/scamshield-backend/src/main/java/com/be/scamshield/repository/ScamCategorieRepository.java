package com.be.scamshield.repository;

import com.be.scamshield.entity.ScamCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScamCategorieRepository extends JpaRepository<ScamCategory, Long> {
    interface AdminCategoryRow {
        Long getId();
        String getCode();
        String getName();
        String getDescription();
        Boolean getIsActive();
        Integer getVersion();
        Long getApprovedReportCount();
    }

    Optional<ScamCategory> findByCode(String code);
    Optional<ScamCategory> findByName(String name);
    List<ScamCategory> findByIsActiveTrueOrderByNameAsc();

    @Query(value = """
            SELECT c.id AS "id", c.code AS "code", c.name AS "name",
                   c.description AS "description", c.is_active AS "isActive",
                   c.version AS "version",
                   count(r.id) FILTER (WHERE r.status = 'APPROVED') AS "approvedReportCount"
            FROM scam_categories c
            LEFT JOIN reports r ON r.category_id = c.id
            GROUP BY c.id, c.code, c.name, c.description, c.is_active, c.version
            ORDER BY c.code
            """, nativeQuery = true)
    List<AdminCategoryRow> findAllWithApprovedReportCounts();

    @Query(value = "SELECT count(*) FROM reports WHERE category_id = :categoryId AND status = 'APPROVED'",
            nativeQuery = true)
    long countApprovedReports(@Param("categoryId") Long categoryId);

    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(723684001)", nativeQuery = true)
    Integer lockCodeAllocation();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select category from ScamCategory category where category.id = :id")
    Optional<ScamCategory> findByIdForUpdate(@Param("id") Long id);
}
