package com.be.scamshield.repository;

import com.be.scamshield.entity.OfficialScamWarning;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OfficialScamWarningRepository extends JpaRepository<OfficialScamWarning, Long> {

    List<OfficialScamWarning> findByStatusOrderByCreatedAtDesc(String status);

    Page<OfficialScamWarning> findByStatusOrderByCreatedAtDesc(String status, Pageable pageable);
}

