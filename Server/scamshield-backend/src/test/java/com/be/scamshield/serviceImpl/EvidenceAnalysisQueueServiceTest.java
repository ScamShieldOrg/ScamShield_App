package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.*;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EvidenceAnalysisQueueServiceTest {
    private final EvidenceAnalysisProperties properties = new EvidenceAnalysisProperties();
    private final SupabaseStorageService storage = mock(SupabaseStorageService.class);
    private final ReportEvidenceRepository evidences = mock(ReportEvidenceRepository.class);
    private final EvidenceAnalysisQueueService service = new EvidenceAnalysisQueueService(properties, storage, evidences, mock(IndicatorRepository.class), mock(org.springframework.context.ApplicationEventPublisher.class));

    @Test
    void onlyServerStorageKeysAreQueuedAndUrlsAreNeverFetchedDirectly() {
        ReportEvidence file = new ReportEvidence();
        service.prepare(file, "evidences/file.png");
        assertThat(file.getAnalysisStatus()).isEqualTo(EvidenceAnalysisStatus.PENDING);
        service.prepare(file, "evidences/../../secret");
        assertThat(file.getAnalysisStatus()).isEqualTo(EvidenceAnalysisStatus.NOT_ANALYZED);
        assertThat(file.getStorageObjectKey()).isNull();
        file.setFileUrl("http://127.0.0.1/private"); service.prepareFromUrl(file);
        assertThat(file.getStorageObjectKey()).isNull();
    }

    @Test
    void reanalysisRequiresEvidenceBelongingToTheRequestedReportAndClearsOldResults() {
        ReportEvidence file = ReportEvidence.builder().id(2L).report(Report.builder().id(1L).build())
                .storageObjectKey("evidences/file.png").perceptualHash(12L).ocrText("old").analysisStatus(EvidenceAnalysisStatus.COMPLETED).build();
        when(evidences.findById(2L)).thenReturn(Optional.of(file));

        assertThatThrownBy(() -> service.enqueue(99L, 2L)).isInstanceOf(ResourceNotFoundException.class);
        assertThat(service.enqueue(1L, 2L)).isEqualTo(EvidenceAnalysisStatus.PENDING);
        assertThat(file.getPerceptualHash()).isNull();
        assertThat(file.getOcrText()).isNull();
        properties.setEnabled(false);
        assertThatThrownBy(() -> service.enqueue(1L, 2L)).isInstanceOf(BadRequestException.class);
    }
}
