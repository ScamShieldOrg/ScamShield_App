package com.be.scamshield.repository;

import com.be.scamshield.entity.CheckVerdict;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CheckVerdictRepository extends JpaRepository<CheckVerdict, Long> {
    Optional<CheckVerdict> findByCheckRequestId(Long checkRequestId);
}
