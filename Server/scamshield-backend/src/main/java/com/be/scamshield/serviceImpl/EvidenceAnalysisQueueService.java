package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class EvidenceAnalysisQueueService {
    private final EvidenceAnalysisProperties properties;
    private final SupabaseStorageService storage;
    private final ReportEvidenceRepository evidences;

    private final IndicatorRepository indicators;
    private final ApplicationEventPublisher events;

    public void prepare(ReportEvidence evidence, String key) {
        boolean valid = key != null && key.startsWith("evidences/") && !key.contains("..") && key.matches("[A-Za-z0-9._/-]+");
        evidence.setStorageObjectKey(valid ? key : null);
        evidence.setAnalysisStatus(properties.isEnabled() && valid ? EvidenceAnalysisStatus.PENDING : EvidenceAnalysisStatus.NOT_ANALYZED);
        evidence.setAnalysisMessage(!valid ? "STORAGE_KEY_UNAVAILABLE" : !properties.isEnabled() ? "DISABLED" : "QUEUED");
        evidence.setAnalysisAttempts(0);
    }

    public void prepareFromUrl(ReportEvidence evidence) {
        prepare(evidence, storage.evidenceKeyFromUrl(evidence.getFileUrl()));
    }

    @Transactional
    public EvidenceAnalysisStatus enqueue(Long reportId, Long evidenceId) {
        if (reportId == null || evidenceId == null || reportId <= 0 || evidenceId <= 0) throw new BadRequestException("ID phải là số dương");
        if (!properties.isEnabled()) throw new BadRequestException("Phân tích minh chứng đang tắt");
        indicators.lockForReport(reportId);
        ReportEvidence evidence = evidences.findById(evidenceId).filter(e -> e.getReport().getId().equals(reportId))
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy minh chứng trong báo cáo"));
        String key = evidence.getStorageObjectKey() != null ? evidence.getStorageObjectKey() : storage.evidenceKeyFromUrl(evidence.getFileUrl());
        prepare(evidence, key);
        if (evidence.getStorageObjectKey() == null) throw new BadRequestException("Chỉ phân tích tệp thuộc kho minh chứng của hệ thống");
        evidence.setPerceptualHash(null); evidence.setOcrText(null); evidence.setOcrTextHash(null);
        evidence.setOcrSimHash(null); evidence.setAnalysisVersion(null); evidence.setAnalyzedAt(null);
        evidences.saveAndFlush(evidence);
        events.publishEvent(new EvidenceAnalysisRequested(evidenceId));

        return evidence.getAnalysisStatus();
    }
}
