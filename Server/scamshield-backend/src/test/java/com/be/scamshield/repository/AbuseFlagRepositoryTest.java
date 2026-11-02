package com.be.scamshield.repository;

import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.User;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class AbuseFlagRepositoryTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 28, 9, 0);
    private static final List<String> STATUSES = List.of("PENDING", "DISMISSED", "OPEN");
    private static final Sort ORDER = Sort.by(Sort.Direction.DESC, "createdAt", "id");

    @Autowired private AbuseFlagRepository repository;
    @Autowired private EntityManager entityManager;

    @Test
    void historyIsScopedToAccountWithStableOrderingAndCorrectPageCounts() {
        User target = account("target", "0900000001");
        User other = account("other", "0900000002");
        AbuseFlag oldest = flag(target, "OPEN", NOW.minusDays(1));
        AbuseFlag sameTimeFirst = flag(target, "PENDING", NOW);
        AbuseFlag sameTimeSecond = flag(target, "DISMISSED", NOW);
        flag(other, "PENDING", NOW.plusDays(1));
        flag(null, "OPEN", NOW.plusDays(1));
        AbuseFlag legacy = flag(target, "RESOLVED", NOW.plusDays(1));
        entityManager.flush();
        entityManager.clear();

        var firstPage = repository.findByUserIdAndStatusIn(target.getId(), STATUSES, PageRequest.of(0, 2, ORDER));
        assertThat(firstPage.getContent()).extracting(AbuseFlag::getId)
                .containsExactly(sameTimeSecond.getId(), sameTimeFirst.getId());
        assertThat(firstPage.getTotalElements()).isEqualTo(3);
        assertThat(firstPage.getTotalPages()).isEqualTo(2);
        assertThat(firstPage.hasNext()).isTrue();

        var secondPage = repository.findByUserIdAndStatusIn(target.getId(), STATUSES, PageRequest.of(1, 2, ORDER));
        assertThat(secondPage.getContent()).extracting(AbuseFlag::getId).containsExactly(oldest.getId());
        assertThat(secondPage.getTotalElements()).isEqualTo(3);
        assertThat(secondPage.hasNext()).isFalse();

        assertThat(repository.findById(legacy.getId())).get().extracting(AbuseFlag::getStatus).isEqualTo("RESOLVED");
    }

    @Test
    void statusFilterAndOutOfRangePageKeepAccurateTotals() {
        User target = account("target", "0900000001");
        AbuseFlag pending = flag(target, "PENDING", NOW);
        flag(target, "OPEN", NOW);
        entityManager.flush();
        entityManager.clear();

        var result = repository.findByUserIdAndStatusIn(target.getId(), List.of("PENDING"), PageRequest.of(0, 20, ORDER));
        assertThat(result.getContent()).extracting(AbuseFlag::getId).containsExactly(pending.getId());
        assertThat(result.getTotalElements()).isEqualTo(1);

        var pastEnd = repository.findByUserIdAndStatusIn(target.getId(), STATUSES, PageRequest.of(10, 20, ORDER));
        assertThat(pastEnd.getContent()).isEmpty();
        assertThat(pastEnd.getTotalElements()).isEqualTo(2);
    }

    private User account(String name, String phone) {
        User user = User.builder().fullName(name).email(name + "@example.test").phoneNumber(phone)
                .passwordHash("test-hash").status("ACTIVE").reputationPoints(0).build();
        entityManager.persist(user);
        return user;
    }

    private AbuseFlag flag(User user, String status, LocalDateTime createdAt) {
        AbuseFlag flag = AbuseFlag.builder().user(user).flagType("BULK_REPORTING")
                .severity("MEDIUM").status(status).createdAt(createdAt).build();
        entityManager.persist(flag);
        return flag;
    }
}
