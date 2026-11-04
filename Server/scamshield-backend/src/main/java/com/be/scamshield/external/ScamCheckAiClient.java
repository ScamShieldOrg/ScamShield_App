package com.be.scamshield.external;

import com.be.scamshield.dto.response.ScamCheckAiDetails;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Calls the AI service with the original content; never logs input or response bodies. */
@Component
@Slf4j
public class ScamCheckAiClient {
    private final ObjectMapper json;
    private final HttpClient http;
    private final URI endpoint;
    private final Duration timeout;
    private final boolean enabled;

    public ScamCheckAiClient(ObjectMapper json,
            @Value("${app.scam-check.ai.base-url:http://localhost:8000}") String baseUrl,
            @Value("${app.scam-check.ai.connect-timeout-ms:2000}") long connectTimeout,
            @Value("${app.scam-check.ai.request-timeout-ms:60000}") long requestTimeout,
            @Value("${app.scam-check.ai.enabled:true}") boolean enabled) {
        this.json = json;
        // Uvicorn's HTTP/1.1 server does not support Java's cleartext HTTP/2 upgrade.
        this.http = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofMillis(connectTimeout)).build();
        this.endpoint = URI.create(baseUrl.replaceAll("/+$", "") + "/api/v1/scan");
        this.timeout = Duration.ofMillis(requestTimeout);
        this.enabled = enabled;
    }

    public record Result(String verdict, String stage, BigDecimal confidence, String summary,
                         String guidance, String unknownReason, String scanId, ScamCheckAiDetails aiDetails) {
        public static Result failure(String reason) {
            return new Result("UNKNOWN", "NONE", null,
                    "Chưa thể hoàn tất phân tích AI. Vui lòng thử lại sau.",
                    "Chưa xác định không có nghĩa là an toàn. Không chuyển tiền hoặc cung cấp OTP khi chưa xác minh.",
                    reason, null, null);
        }
    }

    public Result scan(Long checkId, String inputType, String content) {
        long started = System.nanoTime();
        if (!enabled) {
            log.warn("Scam check AI skipped: checkId={}, reason=AI_DISABLED", checkId);
            return Result.failure("AI_UNAVAILABLE");
        }
        String type = switch (inputType) {
            case "MESSAGE" -> "SMS";
            case "URL" -> "URL";
            default -> throw new IllegalArgumentException("Unsupported AI scan input type");
        };
        String outcome = "FAILED";
        Integer httpStatus = null;
        try {
            log.info("Scam check AI request started: checkId={}, checkType={}, aiHost={}, aiPort={}, timeoutMs={}",
                    checkId, type, endpoint.getHost(), endpoint.getPort(), timeout.toMillis());
            var request = HttpRequest.newBuilder(endpoint).timeout(timeout)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(Map.of(
                            "content", content, "check_type", type, "core_check_id", checkId,
                            "force_tier2", false))))
                    .build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            httpStatus = response.statusCode();
            long elapsedMs = (System.nanoTime() - started) / 1_000_000;
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                outcome = "HTTP_ERROR";
                log.warn("Scam check AI HTTP failure: checkId={}, checkType={}, httpStatus={}, aiErrorCode={}, elapsedMs={}",
                        checkId, type, response.statusCode(), aiErrorCode(response.body()), elapsedMs);
                return Result.failure("AI_UNAVAILABLE");
            }
            var result = parse(response.body(), inputType);
            if ("AI_INVALID_RESPONSE".equals(result.unknownReason())) {
                outcome = "INVALID_RESPONSE";
                log.warn("Scam check AI invalid response: checkId={}, checkType={}, httpStatus={}, issue={}, aiErrorCode={}, elapsedMs={}",
                        checkId, type, response.statusCode(), responseIssue(response.body()),
                        aiErrorCode(response.body()), elapsedMs);
            } else {
                outcome = "COMPLETED";
                log.info("Scam check AI response mapped: checkId={}, verdict={}, stage={}, confidence={}, unknownReason={}, httpStatus={}, elapsedMs={}",
                        checkId, result.verdict(), result.stage(), result.confidence(), result.unknownReason(), response.statusCode(), elapsedMs);
            }
            return result;
        } catch (HttpTimeoutException ex) {
            outcome = "TIMEOUT";
            log.warn("Scam check AI timed out: checkId={}, checkType={}, timeoutMs={}, elapsedMs={}, errorType={}",
                    checkId, type, timeout.toMillis(), (System.nanoTime() - started) / 1_000_000,
                    ex.getClass().getSimpleName());
            return Result.failure("AI_UNAVAILABLE");
        } catch (InterruptedException ex) {
            outcome = "INTERRUPTED";
            log.warn("Scam check AI interrupted: checkId={}, checkType={}", checkId, type);
            Thread.currentThread().interrupt();
            return Result.failure("AI_UNAVAILABLE");
        } catch (IOException ex) {
            outcome = "NETWORK_ERROR";
            log.warn("Scam check AI network failure: checkId={}, checkType={}, errorType={}, causeType={}, elapsedMs={}",
                    checkId, type, ex.getClass().getSimpleName(),
                    ex.getCause() == null ? "NONE" : ex.getCause().getClass().getSimpleName(),
                    (System.nanoTime() - started) / 1_000_000, ex);
            return Result.failure("AI_UNAVAILABLE");
        } catch (Exception ex) {
            outcome = "REQUEST_ERROR";
            log.warn("Scam check AI request failed: checkId={}, checkType={}, errorType={}, causeType={}, elapsedMs={}",
                    checkId, type, ex.getClass().getSimpleName(),
                    ex.getCause() == null ? "NONE" : ex.getCause().getClass().getSimpleName(),
                    (System.nanoTime() - started) / 1_000_000);
            return Result.failure("AI_UNAVAILABLE");
        } finally {
            log.info("Scam check AI request finished: checkId={}, checkType={}, outcome={}, httpStatus={}, elapsedMs={}",
                    checkId, type, outcome, httpStatus, (System.nanoTime() - started) / 1_000_000);
        }
    }

    /** Extract only a machine-readable error code; never log AI messages or response bodies. */
    String aiErrorCode(String body) {
        try {
            JsonNode error = json.readTree(body).path("error");
            String code = error.isObject() ? error.path("code").asText("") : error.asText("");
            return code.matches("[A-Za-z0-9_.-]{1,80}") ? code : "UNSPECIFIED";
        } catch (Exception ex) {
            return "UNSPECIFIED";
        }
    }

    /** Report the first invalid contract field without including its value. */
    String responseIssue(String body) {
        try {
            JsonNode root = json.readTree(body);
            if (!"success".equals(root.path("status").asText())) return "AI_STATUS_ERROR";
            if (!root.path("error").isNull() && !root.path("error").isMissingNode()) return "UNEXPECTED_ERROR_FIELD";
            JsonNode data = scanData(root);
            if (data.path("scan_id").asText("").isBlank()) return "MISSING_SCAN_ID";
            if (firstText(data, "timestamp", "created_at").isBlank()) return "MISSING_TIMESTAMP";
            if (!List.of(1, 2).contains(data.path("tier_executed").asInt(0))) return "INVALID_TIER";
            JsonNode verdict = data.path("verdict");
            if (!List.of("SCAM_RISK", "LOW_RISK", "UNKNOWN")
                    .contains(normalizeRisk(verdict.path("risk_level").asText("")))) return "INVALID_RISK_LEVEL";
            JsonNode riskScore = verdict.path("risk_score");
            boolean unknown = "UNKNOWN".equals(normalizeRisk(verdict.path("risk_level").asText()));
            if (riskScore.isMissingNode() || (!riskScore.isNumber() && !(unknown && riskScore.isNull())))
                return "INVALID_RISK_SCORE";
            if (!verdict.path("confidence").isNumber()) return "INVALID_CONFIDENCE";
            if (firstText(verdict, "scam_category", "scam_type").isBlank()) return "MISSING_SCAM_CATEGORY";
            if (verdict.path("summary").asText("").isBlank()) return "MISSING_SUMMARY";
            if (!recommendations(data).isArray()) return "INVALID_RECOMMENDATIONS";
            if (!data.path("radar_metrics").isMissingNode() && !data.path("radar_metrics").isObject()
                    && !data.path("radar_metrics").isNull()) return "INVALID_RADAR_METRICS";
            return "INVALID_FIELD_VALUE";
        } catch (Exception ex) {
            return "MALFORMED_JSON";
        }
    }

    private JsonNode scanData(JsonNode root) {
        JsonNode data = root.path("data");
        return data.isObject() ? data : root;
    }

    private JsonNode recommendations(JsonNode data) {
        JsonNode actionable = data.path("actionable_recommendations");
        return actionable.isMissingNode() ? data.path("recommendations") : actionable;
    }

    private String firstText(JsonNode node, String preferred, String fallback) {
        String value = node.path(preferred).asText("");
        return value.isBlank() ? node.path(fallback).asText("") : value;
    }

    Result parse(String body, String inputType) {
        try {
            JsonNode root = json.readTree(body);
            JsonNode data = scanData(root);
            JsonNode verdict = data.path("verdict");
            String risk = normalizeRisk(verdict.path("risk_level").asText(""));
            String scanId = data.path("scan_id").asText("");
            String createdAt = firstText(data, "timestamp", "created_at");
            int tier = data.path("tier_executed").asInt(0);
            JsonNode confidence = verdict.path("confidence");
            JsonNode riskScore = verdict.path("risk_score");
            String summary = verdict.path("summary").asText("");
            String scamType = firstText(verdict, "scam_category", "scam_type");
            JsonNode recommendations = recommendations(data);
            if (!"success".equals(root.path("status").asText()) || !root.path("error").isNull()
                    && !root.path("error").isMissingNode()
                    || scanId.isBlank() || scanId.length() > 200 || createdAt.isBlank() || (tier != 1 && tier != 2)
                    || !List.of("SCAM_RISK", "LOW_RISK", "UNKNOWN").contains(risk)
                    || !confidence.isNumber() || confidence.asDouble() < 0 || confidence.asDouble() > 1
                    || riskScore.isMissingNode()
                    || (!riskScore.isNumber() && !("UNKNOWN".equals(risk) && riskScore.isNull()))
                    || (riskScore.isNumber() && (riskScore.asDouble() < 0 || riskScore.asDouble() > 100))
                    || summary.isBlank() || scamType.isBlank() || !recommendations.isArray()) return Result.failure("AI_INVALID_RESPONSE");
            var guidance = new StringBuilder();
            var advice = new ArrayList<String>();
            for (JsonNode item : recommendations) {
                if (!item.isTextual()) return Result.failure("AI_INVALID_RESPONSE");
                if (!guidance.isEmpty()) guidance.append('\n');
                guidance.append(item.asText());
                advice.add(item.asText());
            }
            if (guidance.isEmpty()) guidance.append("Xác minh qua kênh chính thức trước khi chuyển tiền hoặc cung cấp thông tin cá nhân.");
            var radar = new LinkedHashMap<String, BigDecimal>();
            JsonNode radarNode = data.path("radar_metrics");
            if (!radarNode.isMissingNode() && !radarNode.isNull()) {
                if (!radarNode.isObject()) return Result.failure("AI_INVALID_RESPONSE");
                for (String key : List.of("urgency", "authority_impersonation", "financial_lure", "suspicious_channel", "data_harvesting")) {
                    JsonNode metric = radarNode.path(key);
                    if (!metric.isNumber() || metric.asDouble() < 0 || metric.asDouble() > 100) return Result.failure("AI_INVALID_RESPONSE");
                    radar.put(key, metric.decimalValue());
                }
            }
            JsonNode councilNode = data.path("council_breakdown");
            if (councilNode.isMissingNode()) councilNode = data.path("council_audit");
            ScamCheckAiDetails.CouncilAudit council = null;
            if (!councilNode.isMissingNode() && !councilNode.isNull()) {
                if (!councilNode.isObject()) return Result.failure("AI_INVALID_RESPONSE");
                var agents = new ArrayList<ScamCheckAiDetails.AgentFinding>();
                JsonNode agentNodes = councilNode.path("agents");
                if (!agentNodes.isMissingNode() && !agentNodes.isArray()) return Result.failure("AI_INVALID_RESPONSE");
                if (agentNodes.isArray()) {
                    for (JsonNode agent : agentNodes) {
                        if (!agent.isObject() || !agent.path("score").isNumber()) return Result.failure("AI_INVALID_RESPONSE");
                        agents.add(new ScamCheckAiDetails.AgentFinding(
                                agent.path("role").asText(""), normalizeAgentRisk(agent.path("verdict").asText("")),
                                agent.path("score").decimalValue()));
                    }
                }
                council = new ScamCheckAiDetails.CouncilAudit(
                        councilNode.path("consensus_ratio").asText(null),
                        firstText(councilNode, "lead_model", "lead_evaluator"),
                        councilNode.path("early_exit").asBoolean(false),
                        councilNode.path("defender_intervened").asBoolean(false), List.copyOf(agents));
            }
            var details = new ScamCheckAiDetails(scanId, createdAt, tier,
                    new ScamCheckAiDetails.AiVerdict(risk, "UNKNOWN".equals(risk) ? null : riskScore.decimalValue(),
                            scamType, confidence.decimalValue(), summary),
                    radar.isEmpty() ? null : radar, advice, council);
            return new Result(risk, "URL".equals(inputType) ? "URL_REPUTATION" : tier == 1 ? "VISOBERT" : "LLM",
                    confidence.decimalValue(), summary, guidance.toString(),
                    "UNKNOWN".equals(risk) ? "AI_UNCERTAIN" : null, scanId, details);
        } catch (Exception ex) {
            return Result.failure("AI_INVALID_RESPONSE");
        }
    }

    private String normalizeRisk(String risk) {
        return switch (risk) {
            case "SAFE", "LOW-RISK" -> "LOW_RISK";
            case "DANGEROUS", "SCAM-RISK" -> "SCAM_RISK";
            case "SUSPICIOUS", "REVIEW", "SUSPICIOUS_REVIEW" -> "UNKNOWN";
            default -> risk;
        };
    }

    private String normalizeAgentRisk(String risk) {
        String normalized = normalizeRisk(risk);
        return List.of("SCAM_RISK", "LOW_RISK", "UNKNOWN").contains(normalized) ? normalized : "UNKNOWN";
    }
}
