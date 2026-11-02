package com.be.scamshield.repository;

import com.be.scamshield.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, Long entityId);

    @EntityGraph(attributePaths = {"actorUser"})
    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDescIdDesc(String entityType, Long entityId);

}
