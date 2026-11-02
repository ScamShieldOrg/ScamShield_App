package com.be.scamshield.repository;

import com.be.scamshield.entity.ReportEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ReportEvidenceRepository extends JpaRepository<ReportEvidence, Long> {
    List<ReportEvidence> findByReportId(Long reportId);
    List<ReportEvidence> findByReportIdIn(Collection<Long> reportIds);

    List<ReportEvidence> findByReportIdInOrderByCreatedAtAscIdAsc(Collection<Long> reportIds);
}
