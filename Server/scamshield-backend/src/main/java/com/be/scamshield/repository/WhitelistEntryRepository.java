package com.be.scamshield.repository;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.entity.WhitelistEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface WhitelistEntryRepository extends JpaRepository<WhitelistEntry, Long> {
    boolean existsByIndicatorIdAndVerificationStatusAndPartnerIdNot(Long indicatorId, String verificationStatus, Long partnerId);

    Optional<WhitelistEntry> findByIndicatorIdAndPartnerId(Long indicatorId, Long partnerId);

    @Query("""
            SELECT w FROM WhitelistEntry w JOIN w.partner p
            WHERE w.indicator.id IN :ids AND w.verificationStatus = 'VERIFIED'
              AND p.verificationStatus = :verified AND p.user.status = 'ACTIVE'
              AND (w.verifiedAt IS NULL OR w.verifiedAt <= :now)
              AND (p.verifiedAt IS NULL OR p.verifiedAt <= :now) ORDER BY w.id
            """)
    List<WhitelistEntry> findVerifiedForCheck(Collection<Long> ids, PartnerVerificationStatus verified, LocalDateTime now);
}
