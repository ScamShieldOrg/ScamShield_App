package com.be.scamshield.dto.response;

import com.be.scamshield.constant.ScamVerdict;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/** Display-only snapshot of the AI decision; excludes the submitted content and telemetry. */
public record ScamCheckAiDetails(
        String scanId, String createdAt, Integer tierExecuted, AiVerdict verdict,
        Map<String, BigDecimal> radarMetrics, List<String> recommendations,
        CouncilAudit councilAudit) {
    public record AiVerdict(String riskLevel, BigDecimal riskScore, String scamType,
                            BigDecimal confidence, String summary) {
        public AiVerdict {
            riskLevel = ScamVerdict.normalize(riskLevel);
            if ("UNKNOWN".equals(riskLevel)) riskScore = null;
        }
    }
    public record CouncilAudit(String consensusRatio, String leadModel, boolean earlyExit,
                               boolean defenderIntervened, List<AgentFinding> agents) { }
    public record AgentFinding(String role, String verdict, BigDecimal score) {
        public AgentFinding {
            verdict = ScamVerdict.normalize(verdict);
        }
    }
}
