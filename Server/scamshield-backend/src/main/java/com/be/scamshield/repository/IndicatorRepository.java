package com.be.scamshield.repository;

import com.be.scamshield.entity.Indicator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface IndicatorRepository extends JpaRepository<Indicator, Long> {
    Optional<Indicator> findByTypeAndNormalizedValue(String type, String normalizedValue);

    List<Indicator> findByTypeAndNormalizedValueInOrderByIdAsc(String type, Collection<String> values);

    @Query(value = "SELECT 1 FROM pg_advisory_xact_lock(hashtext(:key))", nativeQuery = true)
    Integer lockIdentifier(@Param("key") String key);
}
