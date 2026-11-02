package com.be.scamshield.repository;

import com.be.scamshield.entity.PartnerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import com.be.scamshield.constant.PartnerVerificationStatus;
import java.util.Optional;

public interface PartnerProfileRepository extends JpaRepository<PartnerProfile, Long> {
    boolean existsByTaxCode(String taxCode);

    long countByVerificationStatus(PartnerVerificationStatus status);

    @Query(value = """
            SELECT p FROM PartnerProfile p JOIN FETCH p.user u
            WHERE (:status IS NULL OR p.verificationStatus = :status)
              AND (:search IS NULL OR LOWER(p.legalName) LIKE :search
                   OR LOWER(COALESCE(p.taxCode, '')) LIKE :search
                   OR LOWER(COALESCE(p.officialDomain, '')) LIKE :search
                   OR LOWER(COALESCE(p.officialHotline, '')) LIKE :search
                   OR LOWER(COALESCE(p.smsBrandName, '')) LIKE :search
                   OR LOWER(u.email) LIKE :search)
            """, countQuery = """
            SELECT COUNT(p) FROM PartnerProfile p JOIN p.user u
            WHERE (:status IS NULL OR p.verificationStatus = :status)
              AND (:search IS NULL OR LOWER(p.legalName) LIKE :search
                   OR LOWER(COALESCE(p.taxCode, '')) LIKE :search
                   OR LOWER(COALESCE(p.officialDomain, '')) LIKE :search
                   OR LOWER(COALESCE(p.officialHotline, '')) LIKE :search
                   OR LOWER(COALESCE(p.smsBrandName, '')) LIKE :search
                   OR LOWER(u.email) LIKE :search)
            """)
    Page<PartnerProfile> findForAdmin(@Param("status") PartnerVerificationStatus status,
                                      @Param("search") String search, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PartnerProfile p JOIN FETCH p.user WHERE p.id = :id")
    Optional<PartnerProfile> findByIdForReview(@Param("id") Long id);
}
