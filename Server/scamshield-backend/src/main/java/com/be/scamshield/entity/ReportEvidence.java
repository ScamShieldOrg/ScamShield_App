package com.be.scamshield.entity;

import jakarta.persistence.*;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.constant.EvidenceVerificationStatus;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "report_evidence")
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


    @Column(name = "ocr_text")
    private String ocrText;


    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private EvidenceVerificationStatus verificationStatus;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

}
