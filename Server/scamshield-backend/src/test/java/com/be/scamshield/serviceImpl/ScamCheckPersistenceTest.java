package com.be.scamshield.serviceImpl;

import com.be.scamshield.support.PostgresIntegrationTest;

import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.entity.CheckVerdict;
import com.be.scamshield.entity.CheckVerdictReason;
import com.be.scamshield.repository.CheckVerdictRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ScamCheckPersistenceTest extends PostgresIntegrationTest {
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private CheckVerdictRepository verdicts;
    @Autowired
    private ScamCheckRetentionService retention;

    @Test
    void persistsLongInputAndOneFinalVerdictWithReasons() {
        String text = "Nội dung cần kiểm tra. ".repeat(300);
        CheckRequest check = CheckRequest.builder().inputType("MESSAGE").rawInput(text)
                .normalizedInput(text).maskedInput(text).status("COMPLETED")
                .createdAt(LocalDateTime.now()).build();
        entityManager.persist(check);
        CheckVerdict verdict = CheckVerdict.builder().checkRequest(check).verdict("UNKNOWN")
                .decidedByStage("NONE").unknownReason("AI_NOT_IMPLEMENTED")
                .aiSnapshot("{\"scanId\":\"SC-123\",\"tierExecuted\":1}")
                .riskScore(new BigDecimal("68.50"))
                .createdAt(check.getCreatedAt()).build();
        verdict.getReasons().add(CheckVerdictReason.builder().verdict(verdict)
                .reasonCode("AI_NOT_IMPLEMENTED").sourceStage("NONE").build());
        verdicts.saveAndFlush(verdict);
        Long id = check.getId();
        entityManager.clear();

        CheckVerdict reloaded = verdicts.findByCheckRequestId(id).orElseThrow();
        assertThat(reloaded.getCheckRequest().getRawInput()).isEqualTo(text);
        assertThat(reloaded.getAiSnapshot()).contains("SC-123");
        assertThat(reloaded.getRiskScore()).isEqualByComparingTo("68.50");
        assertThat(reloaded.getReasons()).singleElement()
                .extracting(CheckVerdictReason::getReasonCode).isEqualTo("AI_NOT_IMPLEMENTED");
    }

    @Test
    void retentionRedactsExpiredInputWithoutDeletingResultOrUnexpiredText() {
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        CheckRequest expired = CheckRequest.builder().inputType("MESSAGE").rawInput("private expired input")
                .normalizedInput("private normalized input").maskedInput("masked").inputHash("hash")
                .status("COMPLETED").createdAt(now.minusDays(31)).retentionExpiresAt(now.minusDays(1)).build();
        CheckRequest current = CheckRequest.builder().inputType("MESSAGE").rawInput("current input")
                .status("COMPLETED").createdAt(now).retentionExpiresAt(now.plusDays(30)).build();
        entityManager.persist(expired);
        entityManager.persist(current);
        entityManager.flush();
        Long expiredId = expired.getId();
        Long currentId = current.getId();
        retention.redactExpiredInputs();
        entityManager.clear();
        CheckRequest redacted = entityManager.find(CheckRequest.class, expiredId);
        assertThat(redacted.getRawInput()).isNull();
        assertThat(redacted.getNormalizedInput()).isNull();
        assertThat(redacted.getMaskedInput()).isNull();
        assertThat(redacted.getInputHash()).isNull();
        assertThat(redacted.getStatus()).isEqualTo("COMPLETED");
        assertThat(entityManager.find(CheckRequest.class, currentId).getRawInput()).isEqualTo("current input");
    }
}
