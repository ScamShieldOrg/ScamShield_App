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
    Optional<PartnerProfile> findByUserId(Long userId);

    boolean existsByTaxCode(String taxCode);

    @Query("SELECT p FROM PartnerProfile p JOIN FETCH p.user WHERE p.registrationToken = :registrationToken")
    Optional<PartnerProfile> findByRegistrationToken(@Param("registrationToken") String registrationToken);

    java.util.List<PartnerProfile> findTop20ByDocumentVerificationStatusOrderByCreatedAtAsc(String status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE PartnerProfile p SET p.documentVerificationStatus = 'RUNNING_OCR', p.documentVerificationStartedAt = :startedAt WHERE p.id = :id AND p.documentVerificationStatus = 'PENDING_OCR'")
    int claimDocumentVerification(@Param("id") Long id, @Param("startedAt") java.time.LocalDateTime startedAt);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE PartnerProfile p SET p.documentVerificationStatus = 'PENDING_OCR', p.documentVerificationStartedAt = NULL WHERE p.documentVerificationStatus = 'RUNNING_OCR' AND p.documentVerificationStartedAt < :cutoff")
    int resetStaleDocumentVerification(@Param("cutoff") java.time.LocalDateTime cutoff);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE PartnerProfile p SET p.businessVerificationResult = :result, p.documentVerificationStatus = :status, p.documentVerificationStartedAt = NULL WHERE p.id = :id AND p.documentVerificationStatus = 'RUNNING_OCR'")
    int completeDocumentVerification(@Param("id") Long id, @Param("result") String result,
                                     @Param("status") String status);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query("UPDATE PartnerProfile p SET p.documentVerificationAttempts = :attempts, p.documentVerificationStatus = :status, p.documentVerificationStartedAt = NULL WHERE p.id = :id AND p.documentVerificationStatus = 'RUNNING_OCR'")
    int failDocumentVerification(@Param("id") Long id, @Param("attempts") int attempts,
                                 @Param("status") String status);

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
