package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.repository.ReportEvidenceRepository;
import com.be.scamshield.entity.ReportEvidence;
import com.be.scamshield.util.EvidenceFingerprints;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EvidenceComparisonService {
    private final ReportEvidenceRepository evidences;
    private final EvidenceAnalysisProperties properties;
    interface MatchRow {
        Long getSourceId();
        Long getEvidenceId();
        Long getReportId();
        String getReportStatus();
        Long getReporterId();
        Integer getImageDistance();
        Double getTextSimilarity();
        LocalDateTime getCreatedAt();
        LocalDateTime getReportUpdatedAt();
        Long getTotalCount();
    }


    @Value
    private static class Match implements MatchRow {
        Long sourceId;
        Long evidenceId;
        Long reportId;
        String reportStatus;
        Long reporterId;
        Integer imageDistance;
        Double textSimilarity;
        LocalDateTime createdAt;
        LocalDateTime reportUpdatedAt;
        Long totalCount;
    }

    @Transactional(readOnly = true)
    public List<MatchRow> findMatchesForEvidenceIds(Collection<Long> ids) {
        List<MatchRow> results = new ArrayList<>();
        for (ReportEvidence source : evidences.findAllById(ids)) {
            int minimumCharacters = properties.getMinimumTextCharacters();
            String sourceText = EvidenceFingerprints.normalizeText(source.getOcrText());
            String sourceDomain = EvidenceFingerprints.firstDomain(source.getOcrText());
            String sourceSms = EvidenceFingerprints.normalizeSmsBody(source.getOcrText(), minimumCharacters);
            var candidates = evidences.findAnalysisCandidates(source.getId(), source.getFileHash(),
                    source.getPerceptualHash(), source.getOcrTextHash(), source.getOcrSimHash(),
                    properties.getImageDistance(), properties.getTextCandidateDistance(), sourceDomain, properties.getCandidateLimit());
            List<MatchRow> matches = new ArrayList<>();
            for (var candidate : candidates) {
                Integer distance = source.getPerceptualHash() != null && candidate.getPerceptualHash() != null
                        ? Long.bitCount(source.getPerceptualHash() ^ candidate.getPerceptualHash()) : null;
                if (distance != null && distance > properties.getImageDistance()) distance = null;
                String normalized = sourceText;
                String other = EvidenceFingerprints.normalizeText(candidate.getOcrText());
                String candidateSms = EvidenceFingerprints.normalizeSmsBody(candidate.getOcrText(), minimumCharacters);
                if (!sourceSms.isEmpty() && !candidateSms.isEmpty()) {
                    normalized = sourceSms;
                    other = candidateSms;
                }
                double score = 0;
                if (normalized.length() >= minimumCharacters && other.length() >= minimumCharacters) {
                    score = normalized.equals(other) ? 1.0
                            : EvidenceFingerprints.textSimilarity(normalized, other);
                    if (sourceDomain != null && sourceDomain.equals(EvidenceFingerprints.firstDomain(candidate.getOcrText()))) {
                        score = Math.max(score, EvidenceFingerprints.textContainment(
                                sourceSms.isEmpty() ? normalized : sourceSms,
                                candidateSms.isEmpty() ? other : candidateSms));
                    }
                }
                if (distance == null && score < properties.getTextSimilarity()) continue;
                ReportEvidence target = evidences.findById(candidate.getId()).orElseThrow();
                var report = target.getReport();
                matches.add(new Match(source.getId(), target.getId(), report.getId(),
                        report.getStatus().name(), report.getReporterUser().getId(), distance,
                        score >= properties.getTextSimilarity() ? score : null, target.getCreatedAt(), report.getUpdatedAt(), 0L));
            }
            matches.sort(Comparator.comparingDouble((MatchRow m) -> Math.max(
                    m.getImageDistance() == null ? 0 : 1.0 - m.getImageDistance()/64.0,
                    m.getTextSimilarity() == null ? 0 : m.getTextSimilarity())).reversed()
                    .thenComparing(MatchRow::getEvidenceId));
            for (MatchRow m : matches.stream().limit(20).toList()) {
                results.add(new Match(m.getSourceId(), m.getEvidenceId(), m.getReportId(), m.getReportStatus(),
                        m.getReporterId(), m.getImageDistance(), m.getTextSimilarity(), m.getCreatedAt(), m.getReportUpdatedAt(), (long) matches.size()));
            }
        }
        return results;
    }
}
