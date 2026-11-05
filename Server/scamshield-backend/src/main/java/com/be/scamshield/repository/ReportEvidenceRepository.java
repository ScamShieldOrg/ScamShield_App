package com.be.scamshield.repository;

import com.be.scamshield.entity.ReportEvidence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;

import java.util.Collection;
import java.util.List;
import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ReportEvidenceRepository extends JpaRepository<ReportEvidence, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from ReportEvidence e where e.id = :id")
    Optional<ReportEvidence> findByIdForAnalysis(@Param("id") Long id);

    interface AnalysisCandidate {
        Long getId();
        Long getPerceptualHash();
        String getOcrText();
    }

    @Query(value = """
            SELECT e.id AS id, e.perceptual_hash AS "perceptualHash", e.ocr_text AS "ocrText"
            FROM report_evidence e WHERE e.id <> :id AND e.analysis_version = 1
              AND e.analysis_status IN ('COMPLETED','PARTIAL')
              AND (CAST(:fileHash AS varchar) IS NULL OR e.file_hash IS NULL OR e.file_hash <> :fileHash)
              AND ((CAST(:imageHash AS bigint) IS NOT NULL AND e.perceptual_hash IS NOT NULL
                      AND bit_count((e.perceptual_hash # CAST(:imageHash AS bigint))::bit(64)) <= :imageDistance)
                   OR (CAST(:textHash AS varchar) IS NOT NULL AND e.ocr_text_hash = :textHash)
                   OR (CAST(:simHash AS bigint) IS NOT NULL AND e.ocr_sim_hash IS NOT NULL
                      AND bit_count((e.ocr_sim_hash # CAST(:simHash AS bigint))::bit(64)) <= :textDistance))
            ORDER BY CASE WHEN e.ocr_text_hash = CAST(:textHash AS varchar) THEN 0 ELSE 1 END,
                     bit_count((e.perceptual_hash # CAST(:imageHash AS bigint))::bit(64)) NULLS LAST,
                     bit_count((e.ocr_sim_hash # CAST(:simHash AS bigint))::bit(64)) NULLS LAST, e.id DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<AnalysisCandidate> findAnalysisCandidates(@Param("id") Long id, @Param("fileHash") String fileHash,
            @Param("imageHash") Long imageHash, @Param("textHash") String textHash, @Param("simHash") Long simHash,
            @Param("imageDistance") int imageDistance, @Param("textDistance") int textDistance, @Param("limit") int limit);
    interface DuplicateRow {
        Long getEvidenceId();
        String getFileHash();
        Long getReportId();
        String getReportStatus();
        Long getReporterUserId();
        LocalDateTime getCreatedAt();
        LocalDateTime getReportUpdatedAt();
        Long getTotalCount();
    }

    // Include 21 rows per hash so excluding the current evidence still leaves its first 20 duplicates.
    @Query(value = """
            SELECT d.id AS "evidenceId", d.file_hash AS "fileHash", d.report_id AS "reportId",
                   d.report_status AS "reportStatus", d.reporter_user_id AS "reporterUserId",
                   d.created_at AS "createdAt", d.report_updated_at AS "reportUpdatedAt", d.total_count AS "totalCount"
            FROM (
                SELECT e.id, e.file_hash, e.report_id, e.created_at,
                       r.status AS report_status, r.reporter_user_id, r.updated_at AS report_updated_at,
                       count(*) OVER (PARTITION BY e.file_hash) AS total_count,
                       row_number() OVER (PARTITION BY e.file_hash ORDER BY e.id) AS position
                FROM report_evidence e JOIN reports r ON r.id = e.report_id
                WHERE e.file_hash IN (:hashes)
            ) d
            WHERE d.position <= 21 ORDER BY d.file_hash, d.id
            """, nativeQuery = true)
    List<DuplicateRow> findDuplicateRowsForHashes(@Param("hashes") Collection<String> hashes);

    List<ReportEvidence> findByReportId(Long reportId);
    @EntityGraph(attributePaths = {"report", "report.reporterUser"})
    List<ReportEvidence> findTop20ByFileHashAndIdNotOrderByIdAsc(String fileHash, Long id);
    long countByFileHashAndIdNot(String fileHash, Long id);
    List<ReportEvidence> findByReportIdIn(Collection<Long> reportIds);

    List<ReportEvidence> findByReportIdInOrderByCreatedAtAscIdAsc(Collection<Long> reportIds);
}
