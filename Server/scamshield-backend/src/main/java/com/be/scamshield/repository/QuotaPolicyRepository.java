package com.be.scamshield.repository;

import com.be.scamshield.entity.QuotaPolicy;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QuotaPolicyRepository extends JpaRepository<QuotaPolicy, Long> {

    Optional<QuotaPolicy> findByName(String name);

    Optional<QuotaPolicy> findByNameIgnoreCase(String name);

    Optional<QuotaPolicy> findByRankId(Long rankId);
}
