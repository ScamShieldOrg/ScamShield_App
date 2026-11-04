package com.be.scamshield.external;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class ScamCheckAiClientTest {
    private final ObjectMapper json = new ObjectMapper();

    private String response(String risk, int tier) {
        return """
                {"status":"success","error":null,"data":{"scan_id":"SC-123","created_at":"2026-10-31T10:00:00Z","tier_executed":%d,
                "verdict":{"risk_level":"%s","risk_score":68,"scam_type":"PHISHING","confidence":0.996,"summary":"Model result"},
                "actionable_recommendations":["Verify first","Do not send OTP"]}}
                """.formatted(tier, risk);
    }

    private String flatResponse() {
        return """
                {"status":"success","scan_id":"SC-124","created_at":"2026-10-31T10:00:00Z",
                "tier_executed":1,"verdict":{"risk_level":"SUSPICIOUS","risk_score":68,
                "scam_type":"PHISHING","confidence":0.91,"summary":"Tin nhắn yêu cầu liên hệ qua Telegram"},
                "recommendations":["Xác minh qua kênh chính thức"]}
                """;
    }

    private String actualSmsResponse() {
        return """
                {"status":"success","data":{
                  "scan_id":"SC-20261031-959869","timestamp":"2026-10-31T12:31:46.973791+00:00",
                  "tier_executed":1,"verdict":{
                    "risk_level":"DANGEROUS","risk_score":99.7,
                    "scam_category":"ViSoBERT text classifier","confidence":0.9965,
                    "summary":"ViSoBERT classified this message as SCAM."
                  },
                  "radar_metrics":{"urgency":15,"authority_impersonation":15,
                    "financial_lure":70,"suspicious_channel":70,"data_harvesting":10},
                  "council_breakdown":null,
                  "actionable_recommendations":["Không cung cấp OTP.","Xác minh qua kênh chính thức."],
                  "telemetry":{"routing_path":"TIER_1_DIRECT_FASTPATH","raw_input":"private"}
                },"error":null}
                """;
    }

    private String actualUrlUnknownResponse() {
        return """
                {"status":"success","data":{
                  "scan_id":"SC-20261031-BD6BBB","timestamp":"2026-10-31T12:47:40.207415+00:00",
                  "tier_executed":1,"verdict":{
                    "risk_level":"UNKNOWN","risk_score":null,"scam_category":"Chưa phân loại",
                    "confidence":0,"summary":"Chưa có đủ bằng chứng để kết luận URL an toàn hay nguy hiểm."
                  },
                  "radar_metrics":{"urgency":15,"authority_impersonation":15,
                    "financial_lure":15,"suspicious_channel":20,"data_harvesting":10},
                  "council_breakdown":null,
                  "actionable_recommendations":["Kiểm tra lại qua kênh chính thức.","Không cung cấp OTP."],
                  "telemetry":{"routing_path":"TIER_1_URL_REPUTATION","url_evidence":{"hostname":"translate.google.com"}}
                },"error":null}
                """;
    }

    @Test
    void mapsBothTiersAndRejectsInvalidVerdicts() {
        var client = new ScamCheckAiClient(json, "http://localhost:8000", 1000, 1000, true);
        for (String label : java.util.List.of("SCAM_RISK", "LOW_RISK", "UNKNOWN")) {
            var result = client.parse(response(label, 2), "MESSAGE");
            assertThat(result.verdict()).isEqualTo(label);
            assertThat(result.aiDetails().verdict().riskLevel()).isEqualTo(label);
        }
        assertThat(client.parse(response("SUSPICIOUS", 2), "MESSAGE").unknownReason()).isEqualTo("AI_UNCERTAIN");
        assertThat(client.parse(response("SAFE", 1), "MESSAGE").verdict()).isEqualTo("LOW_RISK");
        assertThat(client.parse(flatResponse(), "MESSAGE").verdict()).isEqualTo("UNKNOWN");
        assertThat(client.parse(flatResponse(), "MESSAGE").aiDetails().recommendations())
                .containsExactly("Xác minh qua kênh chính thức");
        var actual = client.parse(actualSmsResponse(), "MESSAGE");
        assertThat(actual.verdict()).isEqualTo("SCAM_RISK");
        assertThat(actual.stage()).isEqualTo("VISOBERT");
        assertThat(actual.aiDetails().createdAt()).isEqualTo("2026-10-31T12:31:46.973791+00:00");
        assertThat(actual.aiDetails().verdict().scamType()).isEqualTo("ViSoBERT text classifier");
        assertThat(actual.aiDetails().verdict().riskScore()).isEqualByComparingTo("99.7");
        assertThat(json.writeValueAsString(actual.aiDetails())).doesNotContain("telemetry", "raw_input", "private");
        var unknownUrl = client.parse(actualUrlUnknownResponse(), "URL");
        assertThat(unknownUrl.verdict()).isEqualTo("UNKNOWN");
        assertThat(unknownUrl.stage()).isEqualTo("URL_REPUTATION");
        assertThat(unknownUrl.unknownReason()).isEqualTo("AI_UNCERTAIN");
        assertThat(unknownUrl.aiDetails().verdict().riskScore()).isNull();
        assertThat(unknownUrl.aiDetails().verdict().confidence()).isEqualByComparingTo("0");
        assertThat(json.writeValueAsString(unknownUrl.aiDetails())).doesNotContain("telemetry", "url_evidence", "translate.google.com");
        assertThat(client.parse(response("DANGEROUS", 1), "MESSAGE").stage()).isEqualTo("VISOBERT");
        assertThat(client.parse(response("DANGEROUS", 2), "MESSAGE").verdict()).isEqualTo("SCAM_RISK");
        assertThat(client.parse(response("SUSPICIOUS", 2), "MESSAGE").verdict()).isEqualTo("UNKNOWN");
        assertThat(client.parse(response("UNKNOWN", 2), "MESSAGE").unknownReason()).isEqualTo("AI_UNCERTAIN");
        assertThat(client.parse(response("SAFE", 1), "URL").stage()).isEqualTo("URL_REPUTATION");
        assertThat(client.parse(response("SAFE", 0), "MESSAGE").unknownReason()).isEqualTo("AI_INVALID_RESPONSE");
        assertThat(client.parse(response("SAFE", 1).replace("0.996", "1.5"), "MESSAGE").verdict()).isEqualTo("UNKNOWN");
        assertThat(client.parse(response("SAFE", 1).replace("\"status\":\"success\"", "\"status\":\"error\""), "MESSAGE").unknownReason())
                .isEqualTo("AI_INVALID_RESPONSE");
        assertThat(client.parse(response("SAFE", 1).replace("\"risk_score\":68,", ""), "MESSAGE").unknownReason())
                .isEqualTo("AI_INVALID_RESPONSE");
        assertThat(client.parse("{}", "MESSAGE").unknownReason()).isEqualTo("AI_INVALID_RESPONSE");
        assertThat(client.responseIssue("{}")).isEqualTo("AI_STATUS_ERROR");
        assertThat(client.responseIssue(response("SAFE", 1).replace("\"risk_score\":68,", "")))
                .isEqualTo("INVALID_RISK_SCORE");
        assertThat(client.responseIssue("not-json")).isEqualTo("MALFORMED_JSON");
        assertThat(client.aiErrorCode("{\"error\":{\"code\":\"MODEL_UNAVAILABLE\",\"message\":\"private input\"}}"))
                .isEqualTo("MODEL_UNAVAILABLE");
        assertThat(client.aiErrorCode("{\"error\":\"private input\"}"))
                .isEqualTo("UNSPECIFIED");
        var withTelemetry = response("SUSPICIOUS", 2).replace("\"actionable_recommendations\"",
                "\"telemetry\":{\"raw_input\":\"private text\"},\"actionable_recommendations\"");
        var details = client.parse(withTelemetry, "MESSAGE").aiDetails();
        assertThat(details.verdict().riskScore()).isNull();
        assertThat(json.writeValueAsString(details)).doesNotContain("telemetry", "private text", "raw_input");
        var withCouncil = response("DANGEROUS", 2).replace("\"actionable_recommendations\"",
                "\"radar_metrics\":{\"urgency\":80,\"authority_impersonation\":70,\"financial_lure\":60,\"suspicious_channel\":50,\"data_harvesting\":40},"
                        + "\"council_breakdown\":{\"consensus_ratio\":\"3/3\",\"lead_model\":\"model-a\",\"agents\":[{\"role\":\"reviewer\",\"verdict\":\"DANGEROUS\",\"score\":95,\"finding\":\"private input\"}]},"
                        + "\"actionable_recommendations\"");
        var councilResult = client.parse(withCouncil, "MESSAGE");
        assertThat(councilResult.aiDetails().radarMetrics()).hasSize(5);
        assertThat(councilResult.aiDetails().councilAudit().leadModel()).isEqualTo("model-a");
        assertThat(councilResult.aiDetails().councilAudit().agents()).hasSize(1);
        assertThat(json.writeValueAsString(councilResult.aiDetails())).doesNotContain("finding", "private input");
    }

    @Test
    void postsOriginalContentWithMappedTypeAndHandlesHttpErrors() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var payload = new AtomicReference<String>();
        var upgrade = new AtomicReference<String>();
        var protocol = new AtomicReference<String>();
        server.createContext("/api/v1/scan", exchange -> {
            upgrade.set(exchange.getRequestHeaders().getFirst("Upgrade"));
            protocol.set(exchange.getProtocol());
            payload.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = response("DANGEROUS", 1).getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(payload.get().contains("\"core_check_id\":1") ? 200 : 503, bytes.length);
            exchange.getResponseBody().write(bytes);
            exchange.close();
        });
        server.start();
        try {
            var client = new ScamCheckAiClient(json, "http://127.0.0.1:" + server.getAddress().getPort(), 1000, 1000, true);
            String original = "Bạn được tặng 1 phần quà tri ân. Liên hệ Telegram [NUMBER] gặp NV Quân để xác nhận địa chỉ nhận hàng.";
            var result = client.scan(1L, "MESSAGE", original);
            assertThat(result.verdict()).isEqualTo("SCAM_RISK");
            assertThat(result.scanId()).isEqualTo("SC-123");
            assertThat(protocol.get()).isEqualTo("HTTP/1.1");
            assertThat(upgrade.get()).isNull();
            assertThat(json.readTree(payload.get()).path("check_type").asText()).isEqualTo("SMS");
            assertThat(json.readTree(payload.get()).path("content").asText()).isEqualTo(original);
            assertThat(json.readTree(payload.get()).path("core_check_id").asLong()).isEqualTo(1L);
            assertThat(json.readTree(payload.get()).path("force_tier2").asBoolean()).isFalse();
            assertThat(client.scan(2L, "URL", "https://example.test").unknownReason()).isEqualTo("AI_UNAVAILABLE");
            assertThat(json.readTree(payload.get()).path("check_type").asText()).isEqualTo("URL");
        } finally {
            server.stop(0);
        }
    }

    @Test
    void timeoutBecomesUnknown() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/api/v1/scan", exchange -> {
            try {
                Thread.sleep(200);
                exchange.sendResponseHeaders(200, -1);
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            var client = new ScamCheckAiClient(json, "http://127.0.0.1:" + server.getAddress().getPort(), 1000, 30, true);
            assertThat(client.scan(3L, "MESSAGE", "Original content").unknownReason()).isEqualTo("AI_UNAVAILABLE");
        } finally {
            server.stop(0);
        }
    }
}
