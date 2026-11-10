package com.be.scamshield.repository;

import com.be.scamshield.entity.PartnerPasswordLink;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PartnerPasswordLinkRepository extends JpaRepository<PartnerPasswordLink, Long> {
    Optional<PartnerPasswordLink> findByTokenHash(String tokenHash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from PartnerPasswordLink l where l.tokenHash = :hash")
    Optional<PartnerPasswordLink> findLockedByTokenHash(@Param("hash") String hash);

    List<PartnerPasswordLink> findByPartnerIdAndConsumedAtIsNull(Long partnerId);
}
