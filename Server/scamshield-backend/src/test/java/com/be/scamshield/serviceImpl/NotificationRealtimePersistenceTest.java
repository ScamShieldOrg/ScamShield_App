package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.Notification;
import com.be.scamshield.entity.User;
import com.be.scamshield.constant.NotificationType;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import java.time.LocalDateTime;
import static org.mockito.Mockito.verify;

@DataJpaTest(showSql = false, properties = "spring.test.database.replace=none")
@ActiveProfiles("test")
@Import(NotificationRealtimeListener.class)
class NotificationRealtimePersistenceTest extends PostgresIntegrationTest {
    @Autowired private EntityManager em;
    @MockitoBean private NotificationStreamService streams;
    @Test
    void savingNotificationTriggersRecipientRealtimeListener() {
        LocalDateTime now = LocalDateTime.now();
        User user = User.builder().email("realtime-fixture@example.test").fullName("Reporter")
                .phoneNumber("0912345678").passwordHash("test-hash").status("ACTIVE").createdAt(now).updatedAt(now).build();
        em.persist(user);
        em.persist(Notification.builder().user(user).type(NotificationType.REPORT)
                .title("Đã phê duyệt").message("Báo cáo đã được duyệt").build());
        em.flush();
        verify(streams).changedAfterCommit(user.getId());
    }
}
