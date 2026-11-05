package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.*;
import com.be.scamshield.entity.*;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.nio.charset.StandardCharsets;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
@Import({EvidenceAnalysisProcessor.class, EvidenceAnalysisProperties.class, EvidenceComparisonService.class, ModeratorReportServiceImpl.class})
class EvidenceAnalysisPersistenceTest extends PostgresIntegrationTest {
    @Autowired EvidenceAnalysisProcessor processor;
    @Autowired EvidenceAnalysisProperties properties;
    @Autowired ReportEvidenceRepository evidences;
    @Autowired EvidenceComparisonService similarities;
    @Autowired ModeratorReportServiceImpl moderator;
    @Autowired EntityManager em;
    @MockitoBean SupabaseStorageService storage;
    @MockitoBean EvidenceContentAnalyzer analyzer;
    @MockitoBean ReportAssignmentService assignments;

    @Test
    void analysisPreparesHashesAndReviewFindsMatchesWithoutPersistingPairs() throws Exception {
        properties.setEnabled(true);
        Report report = report();
        ReportEvidence first = evidence(report, "evidences/first.png");
        ReportEvidence second = evidence(report, "evidences/second.png");
        em.flush();
        byte[] firstBytes = "first bytes".getBytes(StandardCharsets.UTF_8);
        byte[] secondBytes = "different bytes".getBytes(StandardCharsets.UTF_8);
        when(storage.readEvidence(eq("evidences/first.png"), anyInt())).thenReturn(firstBytes);
        when(storage.readEvidence(eq("evidences/second.png"), anyInt())).thenReturn(secondBytes);
        String text = "Tin nhắn yêu cầu chuyển tiền vào tài khoản 1234567890 để nhận phần thưởng, tuyệt đối không chia sẻ mã OTP.";
        when(analyzer.analyze(eq(firstBytes), eq(ReportEvidenceType.PNG))).thenReturn(new EvidenceContentAnalyzer.Result(42L, text, EvidenceAnalysisStatus.COMPLETED, "OK"));
        when(analyzer.analyze(eq(secondBytes), eq(ReportEvidenceType.PNG))).thenReturn(new EvidenceContentAnalyzer.Result(43L, text.toUpperCase(), EvidenceAnalysisStatus.COMPLETED, "OK"));
        processor.process(first.getId());
        processor.process(second.getId());
        em.flush();
        em.clear();
        var matches = similarities.findMatchesForEvidenceIds(List.of(first.getId(), second.getId()));
        assertThat(matches).hasSize(2);
        assertThat(matches).allSatisfy(row -> {
            assertThat(row.getImageDistance()).isEqualTo(1);
            assertThat(row.getTextSimilarity()).isEqualTo(1);
            assertThat(row.getTotalCount()).isEqualTo(1);
        });
        var pendingResponse = moderator.getReportById(report.getId(), UserPrincipal.builder().id(report.getReporterUser().getId()).role("MODERATOR").build());
        assertThat(pendingResponse.getStatus()).isEqualTo("Pending");
        assertThat(pendingResponse.getEvidences()).allSatisfy(item -> {
            assertThat(item.getSimilarEvidenceCount()).isEqualTo(1);
            assertThat(item.getSimilarEvidences().getFirst().matchTypes()).containsExactly("PHASH", "OCR_TEXT");
        });
        Report reviewing = em.find(Report.class, report.getId());
        reviewing.setStatus(ReportStatus.IN_REVIEW);
        em.flush();
        var response = moderator.getReportById(report.getId(), UserPrincipal.builder().id(report.getReporterUser().getId()).role("MODERATOR").build());
        assertThat(response.getEvidences()).allSatisfy(item -> {
            assertThat(item.getAnalysisStatus()).isEqualTo(EvidenceAnalysisStatus.COMPLETED);
            assertThat(item.getDuplicateCount()).isZero();
            assertThat(item.getSimilarEvidenceCount()).isEqualTo(1);
            assertThat(item.getSimilarEvidences().getFirst().matchTypes()).containsExactly("PHASH", "OCR_TEXT");
        });
        evidences.deleteById(second.getId()); em.flush(); em.clear();
    }

    @Test
    void interruptedStorageJobsRetryOnlyThreeTimesAndDoNotProduceFalseMatches() throws Exception {
        properties.setEnabled(true);
        ReportEvidence evidence = evidence(report(), "evidences/unavailable.png"); em.flush();
        when(storage.readEvidence(anyString(), anyInt())).thenThrow(new IOException("unavailable"));
        processor.process(evidence.getId()); processor.process(evidence.getId()); processor.process(evidence.getId()); em.flush(); em.clear();
        ReportEvidence saved = evidences.findById(evidence.getId()).orElseThrow();
        assertThat(saved.getAnalysisStatus()).isEqualTo(EvidenceAnalysisStatus.FAILED);
        assertThat(saved.getAnalysisAttempts()).isEqualTo(3);
        verifyNoInteractions(analyzer);
    }

    @Test
    void legacyForeignUrlIsMarkedUnanalyzedWithoutMakingNetworkRequests() throws Exception {
        properties.setEnabled(true);
        ReportEvidence file = ReportEvidence.builder().report(report()).evidenceType(ReportEvidenceType.PNG)
                .fileUrl("http://127.0.0.1/secret").createdAt(LocalDateTime.now()).build();
        em.persist(file); em.flush();
        processor.process(file.getId()); em.flush(); em.clear();
        assertThat(evidences.findById(file.getId()).orElseThrow().getAnalysisStatus()).isEqualTo(EvidenceAnalysisStatus.NOT_ANALYZED);
        verify(storage, never()).readEvidence(anyString(), anyInt());
        verifyNoInteractions(analyzer);
    }

    private Report report() {
        LocalDateTime now = LocalDateTime.now();
        User user = User.builder().fullName("Reporter").email("analysis@example.test").phoneNumber("0912345678")
                .passwordHash("test").status("ACTIVE").build(); em.persist(user);
        Indicator indicator = Indicator.builder().type(IndicatorType.PHONE).normalizedValue("0912345600")
                .createdAt(now).updatedAt(now).build(); em.persist(indicator);
        Report report = Report.builder().reporterUser(user).assignedModerator(user).indicator(indicator)
                .status(ReportStatus.PENDING).createdAt(now).updatedAt(now).build(); em.persist(report);
        return report;
    }

    private ReportEvidence evidence(Report report, String key) {
        ReportEvidence evidence = ReportEvidence.builder().report(report).evidenceType(ReportEvidenceType.PNG)
                .storageObjectKey(key).analysisStatus(EvidenceAnalysisStatus.PENDING).createdAt(LocalDateTime.now()).build();
        em.persist(evidence); return evidence;
    }
}
