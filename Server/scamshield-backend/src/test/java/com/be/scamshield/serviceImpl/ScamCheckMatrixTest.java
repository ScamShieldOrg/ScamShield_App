package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.dto.response.ScamCheckAiDetails;
import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** One explicit JUnit test per UTCID column in Function 1. */
class ScamCheckMatrixTest {
    // Exact message from vietnamese_sms_test.csv, spreadsheet row 3 (label 0).
    // AI outcomes are controlled fixtures; these tests do not measure classifier accuracy.
    private static final String SMS = "GHTK - [NUMBER] la ma xac nhan su dung de dang nhap ung dung iGHTK cua ban. Tuyet doi khong chia se OTP voi nguoi khac";
    private final ScamCheckInputProcessor processor = new ScamCheckInputProcessor();

    private ScamCheckRequest request(String type, String text) {
        var request = new ScamCheckRequest();
        request.setInputType(type);
        request.setContent(text);
        return request;
    }

    private void decision(String expected, boolean unavailable) {
        var ai = mock(ScamCheckAiClient.class);
        var service = new ScamCheckDecisionService(mock(IndicatorRepository.class),
                mock(ConfirmedIndicatorRepository.class), mock(WhitelistEntryRepository.class), ai);
        var result = unavailable ? ScamCheckAiClient.Result.failure("AI_UNAVAILABLE")
                : new ScamCheckAiClient.Result(expected, "VISOBERT", new BigDecimal("0.8"),
                "Kết quả phân tích tin nhắn tiếng Việt", "Xác minh qua kênh chính thức",
                "UNKNOWN".equals(expected) ? "AI_UNCERTAIN" : null, null, null);
        when(ai.scan(42L, "MESSAGE", SMS)).thenReturn(result);
        var check = CheckRequest.builder().id(42L).inputType("MESSAGE").rawInput(SMS)
                .createdAt(LocalDateTime.of(2026, 11, 3, 12, 0)).build();
        var verdict = service.decide(check, List.of()).verdict();
        assertThat(verdict.getVerdict()).isEqualTo(expected);
        assertThat(verdict.getExplanation()).isNotBlank();
        assertThat(verdict.getReasons()).singleElement().satisfies(reason ->
                assertThat(reason.getReasonCode()).isEqualTo(unavailable ? "AI_UNAVAILABLE"
                        : "UNKNOWN".equals(expected) ? "AI_UNCERTAIN" : "AI_VERDICT"));
    }

    private void invalid(String type, String text) {
        assertThatThrownBy(() -> processor.prepare(request(type, text))).isInstanceOf(BadRequestException.class);
    }

    private void snapshot(String input, String expected) {
        var verdict = new ScamCheckAiDetails.AiVerdict(input, new BigDecimal("68"),
                "PHISHING", new BigDecimal("0.8"), "Kết quả phân tích");
        assertThat(verdict.riskLevel()).isEqualTo(expected);
        if ("UNKNOWN".equals(expected)) assertThat(verdict.riskScore()).isNull();
    }

    @Test void UTCID01_scamWithReason() { decision("SCAM_RISK", false); }
    @Test void UTCID02_lowRiskWithReason() { decision("LOW_RISK", false); }
    @Test void UTCID03_uncertainWithReason() { decision("UNKNOWN", false); }
    @Test void UTCID04_nullContent() { invalid("MESSAGE", null); }
    @Test void UTCID05_blankContent() { invalid("MESSAGE", " "); }
    @Test void UTCID06_nullInputType() { invalid(null, SMS); }
    @Test void UTCID07_unsupportedScreenshot() { invalid("SCREENSHOT", "base64"); }
    @Test void UTCID08_oneCharacter() {
        assertThat(processor.prepare(request("MESSAGE", "ạ")).normalized()).isEqualTo("ạ");
    }
    @Test void UTCID09_tenThousandCharacters() {
        assertThat(processor.prepare(request("MESSAGE", "ạ".repeat(10000))).normalized()).hasSize(10000);
    }
    @Test void UTCID10_tenThousandAndOneCharacters() { invalid("MESSAGE", "ạ".repeat(10001)); }
    @Test void UTCID11_legacySuspicious() { snapshot("SUSPICIOUS", "UNKNOWN"); }
    @Test void UTCID12_legacySafe() { snapshot("SAFE", "LOW_RISK"); }
    @Test void UTCID13_legacyDangerous() { snapshot("DANGEROUS", "SCAM_RISK"); }
    @Test void UTCID14_aiUnavailable() { decision("UNKNOWN", true); }
    @Test void UTCID15_preserveActualCsvText() {
        assertThat(processor.prepare(request("MESSAGE", SMS)).normalized()).isEqualTo(SMS);
    }
}
