package com.be.scamshield.repository;

import com.be.scamshield.entity.Indicator;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
class IndicatorTypeCompatibilityTest extends PostgresIntegrationTest {
    @Autowired private IndicatorRepository indicators;
    @Autowired private EntityManager em;

    @Test
    void reportLookupFindsLegacyMixedCaseAndPreservesValueMatching() {
        LocalDateTime now = LocalDateTime.now();
        Indicator old = Indicator.builder().type("phone").normalizedValue("0912345678")
                .createdAt(now).updatedAt(now).build();
        em.persist(old);
        em.flush();
        Long id = old.getId();
        em.clear();
        assertThat(indicators.findFirstByTypeIgnoreCaseAndNormalizedValueOrderByIdAsc("PHONE", "0912345678"))
                .get().extracting(Indicator::getId).isEqualTo(id);
        assertThat(indicators.findFirstByTypeIgnoreCaseAndNormalizedValueOrderByIdAsc("PHONE", "0912345679")).isEmpty();
    }
}
