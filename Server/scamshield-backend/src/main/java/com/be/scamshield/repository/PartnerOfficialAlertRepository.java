package com.be.scamshield.repository;

import com.be.scamshield.entity.PartnerOfficialAlert;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PartnerOfficialAlertRepository extends JpaRepository<PartnerOfficialAlert, Long>, JpaSpecificationExecutor<PartnerOfficialAlert> {
    long countByReviewedByIdAndStatus(Long userId, String status);


    Page<PartnerOfficialAlert> findByPartnerId(Long partnerId, Pageable pageable);

    Page<PartnerOfficialAlert> findByPartnerIdAndStatus(Long partnerId, String status, Pageable pageable);

    Optional<PartnerOfficialAlert> findByIdAndPartnerId(Long id, Long partnerId);

    long countByStatus(String status);

    long countByPartnerIdAndStatus(Long partnerId, String status);
}

