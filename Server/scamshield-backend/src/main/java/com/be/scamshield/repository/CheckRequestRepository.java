package com.be.scamshield.repository;

import com.be.scamshield.entity.CheckRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDateTime;

@Repository
public interface CheckRequestRepository extends JpaRepository<CheckRequest, Long>, JpaSpecificationExecutor<CheckRequest> {

    @Query("SELECT COUNT(c) FROM CheckRequest c WHERE c.user.id = :userId AND (c.status IS NULL OR c.status <> 'DELETED')")
    long countTotalByUserId(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE CheckRequest c SET c.status = 'DELETED' WHERE c.user.id = :userId AND c.id IN :ids")
    int softDeleteByIds(@Param("userId") Long userId, @Param("ids") List<Long> ids);

    @Modifying
    @Query("""
            UPDATE CheckRequest c SET c.rawInput = NULL, c.normalizedInput = NULL,
                c.maskedInput = NULL, c.inputHash = NULL
            WHERE c.retentionExpiresAt <= :now
              AND (c.rawInput IS NOT NULL OR c.normalizedInput IS NOT NULL
                   OR c.maskedInput IS NOT NULL OR c.inputHash IS NOT NULL)
            """)
    int redactExpiredInputs(@Param("now") LocalDateTime now);
}
