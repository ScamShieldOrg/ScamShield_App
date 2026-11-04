package com.be.scamshield.repository;

import com.be.scamshield.entity.ReputationTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReputationTransactionRepository extends JpaRepository<ReputationTransaction, Long> {

    List<ReputationTransaction> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<ReputationTransaction> findByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
}
