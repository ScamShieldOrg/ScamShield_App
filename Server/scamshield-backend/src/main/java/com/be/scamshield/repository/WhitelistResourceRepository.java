package com.be.scamshield.repository;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.WhitelistEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface WhitelistResourceRepository extends JpaRepository<PartnerProfile, Long> {
    @Query(value = """
            SELECT p FROM PartnerProfile p
            WHERE p.verificationStatus = :verified
              AND EXISTS (SELECT w.id FROM WhitelistEntry w
                          WHERE w.partner = p AND w.verificationStatus = com.be.scamshield.constant.WhitelistVerificationStatus.VERIFIED)
              AND (:keyword IS NULL
                   OR LOWER(p.legalName) LIKE :keyword
                   OR LOWER(p.brandName) LIKE :keyword
                   OR LOWER(COALESCE(p.officialDomain, '')) LIKE :keyword
                   OR LOWER(COALESCE(p.officialHotline, '')) LIKE :keyword
                   OR LOWER(COALESCE(p.smsBrandName, '')) LIKE :keyword
                   OR LOWER(COALESCE(p.contactPhone, '')) LIKE :keyword
                   OR LOWER(COALESCE(p.corporateEmail, '')) LIKE :keyword
                   OR EXISTS (SELECT w.id FROM WhitelistEntry w JOIN w.indicator i
                              WHERE w.partner = p AND w.verificationStatus = com.be.scamshield.constant.WhitelistVerificationStatus.VERIFIED
                                AND (LOWER(i.normalizedValue) LIKE :keyword
                                     OR LOWER(COALESCE(i.displayValue, '')) LIKE :keyword)))
            ORDER BY CASE WHEN :sortBy = 'name' THEN LOWER(p.legalName) END ASC,
                     CASE WHEN :sortBy = 'newest' THEN p.verifiedAt END DESC, p.id DESC
            """,
            countQuery = """
                    SELECT COUNT(p) FROM PartnerProfile p
                    WHERE p.verificationStatus = :verified
                      AND EXISTS (SELECT w.id FROM WhitelistEntry w
                                  WHERE w.partner = p AND w.verificationStatus = com.be.scamshield.constant.WhitelistVerificationStatus.VERIFIED)
                      AND (:keyword IS NULL
                           OR LOWER(p.legalName) LIKE :keyword
                           OR LOWER(p.brandName) LIKE :keyword
                           OR LOWER(COALESCE(p.officialDomain, '')) LIKE :keyword
                           OR LOWER(COALESCE(p.officialHotline, '')) LIKE :keyword
                           OR LOWER(COALESCE(p.smsBrandName, '')) LIKE :keyword
                           OR LOWER(COALESCE(p.contactPhone, '')) LIKE :keyword
                           OR LOWER(COALESCE(p.corporateEmail, '')) LIKE :keyword
                           OR EXISTS (SELECT w.id FROM WhitelistEntry w JOIN w.indicator i
                                      WHERE w.partner = p AND w.verificationStatus = com.be.scamshield.constant.WhitelistVerificationStatus.VERIFIED
                                        AND (LOWER(i.normalizedValue) LIKE :keyword
                                             OR LOWER(COALESCE(i.displayValue, '')) LIKE :keyword)))
                    """)
    Page<PartnerProfile> findVerifiedPartners(@Param("verified") PartnerVerificationStatus verified,
                                              @Param("keyword") String keyword,
                                              @Param("sortBy") String sortBy,
                                              Pageable pageable);

    @Query("SELECT w FROM WhitelistEntry w JOIN FETCH w.indicator WHERE w.partner.id IN :partnerIds AND w.verificationStatus = com.be.scamshield.constant.WhitelistVerificationStatus.VERIFIED ORDER BY w.id")
    List<WhitelistEntry> findVerifiedEntries(@Param("partnerIds") Collection<Long> partnerIds);
}
