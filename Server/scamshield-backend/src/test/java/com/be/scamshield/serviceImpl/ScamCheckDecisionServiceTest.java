package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScamCheckDecisionServiceTest {
    @Mock
    private IndicatorRepository indicators;
    @Mock
    private ConfirmedIndicatorRepository blacklist;
    @Mock
    private WhitelistEntryRepository whitelist;
    @Mock
    private ScamCheckAiClient aiClient;
    @InjectMocks
    private ScamCheckDecisionService service;
    private final Indicator indicator = Indicator.builder().id(12L).type("URL").normalizedValue("example.com").build();
    private final List<ScamCheckInputProcessor.Candidate> candidates = List.of(
            new ScamCheckInputProcessor.Candidate("URL", "example.com", List.of("example.com"), 0, 11));

    @Test
    void confirmedBlacklistWinsAndDoesNotRequireAnAiScore() {
        when(indicators.findByTypeAndNormalizedValueInOrderByIdAsc(anyString(), anyCollection())).thenReturn(List.of(indicator));
        when(blacklist.findActiveForCheck(anyCollection(), any())).thenReturn(List.of(
                ConfirmedIndicator.builder().indicator(indicator).publicReason("Mạo danh ngân hàng").build()));

        var decision = service.decide(check("MESSAGE"), candidates);
        assertThat(decision.verdict().getVerdict()).isEqualTo("SCAM_RISK");
        assertThat(decision.verdict().getDecidedByStage()).isEqualTo("BLACKLIST");
        assertThat(decision.verdict().getConfidence()).isNull();
        assertThat(decision.verdict().getExplanation()).contains("Mạo danh ngân hàng");
        verifyNoInteractions(whitelist);
    }

    @Test
    void verifiedWhitelistSupportsDirectLookup() {
        when(indicators.findByTypeAndNormalizedValueInOrderByIdAsc(anyString(), anyCollection())).thenReturn(List.of(indicator));
        when(whitelist.findVerifiedForCheck(anyCollection(), any(), any())).thenReturn(List.of(
                WhitelistEntry.builder().indicator(indicator).build()));
        assertThat(service.decide(check("URL"), candidates).verdict().getVerdict()).isEqualTo("LOW_RISK");
    }

    @Test
    void trustedLinkInsideMessageStillRequiresAnalysis() {
        when(indicators.findByTypeAndNormalizedValueInOrderByIdAsc(anyString(), anyCollection())).thenReturn(List.of(indicator));
        when(aiClient.scan(any(), anyString(), any())).thenReturn(ScamCheckAiClient.Result.failure("AI_UNAVAILABLE"));
        var decision = service.decide(check("MESSAGE"), candidates);
        assertThat(decision.verdict().getVerdict()).isEqualTo("UNKNOWN");
        assertThat(decision.verdict().getUnknownReason()).isEqualTo("AI_UNAVAILABLE");
        verifyNoInteractions(whitelist);
    }

    @Test
    void noKnownIndicatorReturnsAnExplicitAiPlaceholder() {
        when(aiClient.scan(any(), anyString(), any())).thenReturn(ScamCheckAiClient.Result.failure("AI_UNAVAILABLE"));
        var decision = service.decide(check("MESSAGE"), List.of());
        assertThat(decision.verdict().getVerdict()).isEqualTo("UNKNOWN");
        assertThat(decision.verdict().getUnknownReason()).isEqualTo("AI_UNAVAILABLE");
        assertThat(decision.verdict().getReasons()).hasSize(1);
        verifyNoInteractions(indicators, blacklist, whitelist);
    }

    @Test
    void phoneAndBankAccountWithoutDecisiveMatchNeverCallAi() {
        for (String type : List.of("PHONE", "BANK_ACCOUNT")) {
            var decision = service.decide(check(type), List.of());
            assertThat(decision.verdict().getVerdict()).isEqualTo("UNKNOWN");
            assertThat(decision.verdict().getUnknownReason()).isEqualTo("NO_DECISIVE_CURATED_MATCH");
            assertThat(decision.verdict().getAiSnapshot()).isNull();
        }
        verifyNoInteractions(aiClient);
    }

    @Test
    void sendsOriginalMessageContentToAi() {
        when(aiClient.scan(any(), anyString(), any())).thenReturn(ScamCheckAiClient.Result.failure("AI_UNAVAILABLE"));
        var check = check("MESSAGE");
        check.setRawInput("Số 0912345678");
        check.setMaskedInput("Số [NUMBER]");
        service.decide(check, List.of());
        verify(aiClient).scan(null, "MESSAGE", "Số 0912345678");
    }

    private CheckRequest check(String inputType) {
        return CheckRequest.builder().inputType(inputType).createdAt(LocalDateTime.now()).build();
    }
}
