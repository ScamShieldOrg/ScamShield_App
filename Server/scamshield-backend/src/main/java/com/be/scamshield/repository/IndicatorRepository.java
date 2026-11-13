package com.be.scamshield.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.constant.IndicatorType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface IndicatorRepository extends JpaRepository<Indicator, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from Indicator i where i.id = (select r.indicator.id from Report r where r.id = :reportId)")
    Optional<Indicator> lockForReport(@Param("reportId") Long reportId);

    Optional<Indicator> findByTypeAndNormalizedValue(IndicatorType type, String normalizedValue);

    Optional<Indicator> findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType type, String normalizedValue);

    Optional<Indicator> findFirstByTypeAndNormalizedValueInOrderByIdAsc(IndicatorType type, List<String> normalizedValues);

    List<Indicator> findByTypeAndNormalizedValueInOrderByIdAsc(IndicatorType type, Collection<String> values);

    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext(:key))", nativeQuery = true)
    Integer lockIdentifier(@Param("key") String key);
}
