package com.be.scamshield.controller;

import com.be.scamshield.support.PostgresIntegrationTest;

import com.be.scamshield.dto.response.ScamCheckAiDetails;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.service.IGuestSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ScamCheckAiIntegrationTest extends PostgresIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired IGuestSessionService sessions;
    @MockitoBean ScamCheckAiClient aiClient;

    @Test
    void aiSnapshotIsReturnedOnPostAndOwnedGetWithoutTelemetry() throws Exception {
        var token = sessions.createOrGetSession(null, null).getSessionToken();
        var details = new ScamCheckAiDetails("SC-123", "2026-10-31T10:00:00Z", 2,
                new ScamCheckAiDetails.AiVerdict("SUSPICIOUS", new BigDecimal("68"), "PHISHING",
                        new BigDecimal("0.9"), "Đáng ngờ"),
                Map.of("urgency", new BigDecimal("80")), List.of("Xác minh qua kênh chính thức"),
                new ScamCheckAiDetails.CouncilAudit("3/3", "model-a", false, true,
                        List.of(new ScamCheckAiDetails.AgentFinding("reviewer", "SUSPICIOUS", new BigDecimal("68")))));
        when(aiClient.scan(any(), eq("MESSAGE"), eq("Nhắn tin cho tôi"))).thenReturn(
                new ScamCheckAiClient.Result("SUSPICIOUS", "LLM", new BigDecimal("0.9"),
                        "Đáng ngờ", "Xác minh qua kênh chính thức", null, "SC-123", details));

        var response = mvc.perform(post("/api/scam-checks").header("X-Guest-Session", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inputType\":\"MESSAGE\",\"content\":\"Nhắn tin cho tôi\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("SUSPICIOUS"))
                .andExpect(jsonPath("$.data.aiDetails.verdict.riskScore").value(68))
                .andExpect(jsonPath("$.data.aiDetails.councilAudit.leadModel").value("model-a"))
                .andExpect(jsonPath("$.data.aiDetails.telemetry").doesNotExist())
                .andReturn();
        var body = json.readTree(response.getResponse().getContentAsString());
        long id = body.path("data").path("checkId").asLong();
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.aiDetails.scanId").value("SC-123"))
                .andExpect(jsonPath("$.data.aiDetails.verdict.riskScore").value(68));
        var other = sessions.createOrGetSession(null, null).getSessionToken();
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", other))
                .andExpect(status().isNotFound());
        verify(aiClient).scan(eq(id), eq("MESSAGE"), eq("Nhắn tin cho tôi"));
    }

    @Test
    void unknownUrlKeepsAiExplanationAndNullableRiskScore() throws Exception {
        var token = sessions.createOrGetSession(null, null).getSessionToken();
        String url = "https://translate.google.com/?hl=vi&sl=en&tl=vi&text=ingestion&op=translate";
        var details = new ScamCheckAiDetails("SC-URL", "2026-10-31T12:47:40+00:00", 1,
                new ScamCheckAiDetails.AiVerdict("UNKNOWN", null, "Chưa phân loại",
                        BigDecimal.ZERO, "Chưa có đủ bằng chứng để kết luận URL an toàn hay nguy hiểm."),
                Map.of("suspicious_channel", new BigDecimal("20")),
                List.of("Kiểm tra lại qua kênh chính thức."), null);
        when(aiClient.scan(any(), eq("URL"), eq(url))).thenReturn(
                new ScamCheckAiClient.Result("UNKNOWN", "URL_REPUTATION", BigDecimal.ZERO,
                        details.verdict().summary(), "Kiểm tra lại qua kênh chính thức.",
                        "AI_UNCERTAIN", "SC-URL", details));

        var response = mvc.perform(post("/api/scam-checks").header("X-Guest-Session", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("inputType", "URL", "content", url))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.decidedByStage").value("URL_REPUTATION"))
                .andExpect(jsonPath("$.data.aiDetails.verdict.riskScore").value(nullValue()))
                .andExpect(jsonPath("$.data.confidence").value(0))
                .andReturn();
        long id = json.readTree(response.getResponse().getContentAsString()).path("data").path("checkId").asLong();
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.aiDetails.scanId").value("SC-URL"))
                .andExpect(jsonPath("$.data.aiDetails.verdict.riskScore").value(nullValue()));
        verify(aiClient).scan(eq(id), eq("URL"), eq(url));
    }
}
