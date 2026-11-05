package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.EvidenceAnalysisStatus;

import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.ReportEvidenceRepository;

import com.be.scamshield.util.EvidenceFingerprints;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class EvidenceAnalysisProcessor {
    private final ReportEvidenceRepository evidences;

    private final EvidenceAnalysisProperties properties;
    private final EvidenceContentAnalyzer analyzer;
    private final SupabaseStorageService storage;

    private final Clock applicationClock;

    @Transactional
    public boolean process(Long evidenceId) {
        if (!properties.isEnabled()) return false;
        ReportEvidence evidence = evidences.findByIdForAnalysis(evidenceId).orElse(null);
        if (evidence == null || (evidence.getAnalysisStatus() != null && evidence.getAnalysisStatus() != EvidenceAnalysisStatus.PENDING)) return false;
        if (evidence.getStorageObjectKey() == null) {
            evidence.setStorageObjectKey(storage.evidenceKeyFromUrl(evidence.getFileUrl()));
            if (evidence.getStorageObjectKey() == null) {
                evidence.setAnalysisStatus(EvidenceAnalysisStatus.NOT_ANALYZED);
                evidence.setAnalysisMessage("STORAGE_KEY_UNAVAILABLE");
                evidences.save(evidence);
                return false;
            }
        }
        evidence.setAnalysisAttempts((evidence.getAnalysisAttempts() == null ? 0 : evidence.getAnalysisAttempts()) + 1);
        try {
            byte[] bytes = storage.readEvidence(evidence.getStorageObjectKey(), properties.getMaxFileMegabytes() * 1024 * 1024);
            var result = analyzer.analyze(bytes, evidence.getEvidenceType());
            evidence.setFileHash(EvidenceFingerprints.sha256(bytes));
            evidence.setPerceptualHash(result.perceptualHash());
            evidence.setOcrText(result.text());
            String normalized = EvidenceFingerprints.normalizeText(result.text());
            if (normalized.length() >= properties.getMinimumTextCharacters()) {
                evidence.setOcrTextHash(EvidenceFingerprints.sha256(normalized.getBytes(StandardCharsets.UTF_8)));
                evidence.setOcrSimHash(EvidenceFingerprints.simHash(normalized));
            }
            evidence.setAnalysisVersion(1);
            evidence.setAnalysisStatus(result.status());
            evidence.setAnalysisMessage(result.message());
            evidence.setAnalyzedAt(LocalDateTime.now(applicationClock));
            // Fingerprints and matches commit together; failed jobs never leave half-written matches.
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            evidence.setAnalysisStatus(EvidenceAnalysisStatus.FAILED);
            evidence.setAnalysisMessage("INTERRUPTED");
            evidences.save(evidence);
            return evidence.getAnalysisStatus() == EvidenceAnalysisStatus.PENDING;
        } catch (Exception exception) {
            evidence.setAnalysisStatus(evidence.getAnalysisAttempts() < 3 ? EvidenceAnalysisStatus.PENDING : EvidenceAnalysisStatus.FAILED);
            evidence.setAnalysisMessage("ANALYSIS_FAILED");
            log.warn("Evidence analysis failed: evidenceId={}, type={}", evidence.getId(), exception.getClass().getSimpleName());
            evidences.save(evidence);
            return evidence.getAnalysisStatus() == EvidenceAnalysisStatus.PENDING;
        }
        evidences.saveAndFlush(evidence);
        return false;
    }
}
