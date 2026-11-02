package com.be.scamshield.repository;

import com.be.scamshield.entity.ModerationAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ModerationActionRepository extends JpaRepository<ModerationAction, Long> {

    List<ModerationAction> findByReportIdOrderByCreatedAtDesc(Long reportId);

    List<ModerationAction> findByReportIdInOrderByCreatedAtDesc(Collection<Long> reportIds);

    @EntityGraph(attributePaths = {"moderatorUser"})
    List<ModerationAction> findByReportIdInOrderByCreatedAtDescIdDesc(Collection<Long> reportIds);
}
