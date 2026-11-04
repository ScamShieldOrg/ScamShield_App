package com.be.scamshield.repository;

import com.be.scamshield.entity.ConfirmedIndicator;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

public interface ConfirmedIndicatorRepository extends JpaRepository<ConfirmedIndicator, Long> {
    @Query("""
            SELECT c FROM ConfirmedIndicator c LEFT JOIN FETCH c.category
            WHERE c.indicator.id IN :ids AND c.status = 'ACTIVE'
              AND c.retractedAt IS NULL AND c.confirmedAt <= :now ORDER BY c.id
            """)
    List<ConfirmedIndicator> findActiveForCheck(Collection<Long> ids, LocalDateTime now);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM ConfirmedIndicator c JOIN FETCH c.indicator i
            WHERE i.type IN :types AND i.normalizedValue IN :values
            ORDER BY c.id
            """)
    List<ConfirmedIndicator> findForDispute(Collection<String> types, Collection<String> values);

    Optional<ConfirmedIndicator> findByIndicatorId(Long indicatorId);
}
