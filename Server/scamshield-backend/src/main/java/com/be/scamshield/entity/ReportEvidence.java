package com.be.scamshield.entity;

import jakarta.persistence.*;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "report_evidence", indexes = {
        @Index(name = "idx_evidence_analysis_status", columnList = "analysis_status,id"),
        @Index(name = "idx_evidence_ocr_text_hash", columnList = "ocr_text_hash")})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportEvidence {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id", nullable = false)
    private Report report;

    @Enumerated(EnumType.STRING)
    @Column(name = "evidence_type", nullable = false)
    private ReportEvidenceType evidenceType;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "file_url")
    private String fileUrl;

    @Column(name = "file_hash")
    private String fileHash;


    @Column(name = "ocr_text", columnDefinition = "text")
    private String ocrText;

    @Column(name = "storage_object_key")
    private String storageObjectKey;

    @Column(name = "perceptual_hash")
    private Long perceptualHash;

    @Column(name = "ocr_text_hash", length = 64)
    private String ocrTextHash;

    @Column(name = "ocr_sim_hash")
    private Long ocrSimHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status")
    private EvidenceAnalysisStatus analysisStatus;

    @Column(name = "analysis_message", length = 80)
    private String analysisMessage;

    private Integer analysisVersion;
    private Integer analysisAttempts;
    private LocalDateTime analyzedAt;


    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

}
