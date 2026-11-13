package com.be.scamshield.repository;

import com.be.scamshield.constant.IndicatorType;

import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.constant.ConfirmedIndicatorStatus;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.data.domain.PageRequest;
import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(showSql = false)
@ActiveProfiles("test")
class IndicatorTypeCompatibilityTest extends PostgresIntegrationTest {
    @Autowired private IndicatorRepository indicators;
    @Autowired private ResourceRepository resources;
    @Autowired private EntityManager em;

    @Test
    void reportLookupUsesEnumTypeAndPreservesValueMatching() {
        LocalDateTime now = LocalDateTime.now();
        Indicator old = Indicator.builder().type(IndicatorType.PHONE).normalizedValue("0912345678")
                .createdAt(now).updatedAt(now).build();
        em.persist(old);
        em.flush();
        Long id = old.getId();
        em.clear();
        assertThat(em.find(Indicator.class, id).getType()).isEqualTo(IndicatorType.PHONE);
        assertThat(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.fromStoredValue(" phone ").orElseThrow(), "0912345678"))
                .get().extracting(Indicator::getId).isEqualTo(id);
        assertThat(indicators.findFirstByTypeAndNormalizedValueOrderByIdAsc(IndicatorType.PHONE, "0912345679")).isEmpty();
    }

    @Test
    void blacklistResourceProjectionAndFiltersReadEnumBackedType() {
        LocalDateTime now = LocalDateTime.now();
        User reviewer = User.builder().fullName("Reviewer").email("enum-reviewer@example.test")
                .phoneNumber("0912345600").passwordHash("test").status("ACTIVE").build();
        em.persist(reviewer);
        Indicator indicator = Indicator.builder().type(IndicatorType.URL).normalizedValue("enum-test.example")
                .displayValue("https://enum-test.example").createdAt(now).updatedAt(now).build();
        em.persist(indicator);
        em.persist(ConfirmedIndicator.builder().indicator(indicator).confirmedByUser(reviewer)
                .status(ConfirmedIndicatorStatus.ACTIVE).confirmedAt(now).build());
        em.flush();
        em.clear();

        var page = resources.findBlackListResources(null, "URL", PageRequest.of(0, 10));
        assertThat(page.getContent()).hasSize(1);
        assertThat(page.getContent().getFirst().getResourceType()).isEqualTo("URL");
        assertThat(resources.findBlackListResources(null, "PHONE", PageRequest.of(0, 10)).getContent()).isEmpty();
    }
}
