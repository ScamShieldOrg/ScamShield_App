package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.NotificationType;

import com.be.scamshield.dto.response.NotificationItemResponse;
import com.be.scamshield.dto.response.NotificationListResponse;
import com.be.scamshield.dto.response.NotificationTabCountsResponse;
import com.be.scamshield.entity.Notification;
import com.be.scamshield.entity.User;
import com.be.scamshield.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private Clock applicationClock;

    @InjectMocks
    private NotificationServiceImpl service;

    private final LocalDateTime fixedNow = LocalDateTime.of(2026, 10, 15, 12, 0, 0);

    @BeforeEach
    void setUp() {
        lenient().when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        lenient().when(applicationClock.instant()).thenReturn(fixedNow.atZone(ZoneId.of("Asia/Ho_Chi_Minh")).toInstant());
    }

    @Test
    void getNotificationsMapsUiFieldsCorrectly() {
        Long userId = 1L;
        User user = User.builder().id(userId).build();

        Notification n1 = Notification.builder()
                .id(1L)
                .user(user)
                .type(NotificationType.REPORT)
                .title("Báo cáo #RPT-8492 đã được phê duyệt")
                .message("Đã thẩm định và đưa số 089.842.XXXX vào Blacklist quốc gia (+50 điểm Sentinel).")
                .referenceId(8492L)
                .isRead(false)
                .createdAt(fixedNow.minusMinutes(15))
                .build();

        Notification n2 = Notification.builder()
                .id(2L)
                .user(user)
                .type(NotificationType.DISPUTE)
                .title("Hồ sơ khiếu nại #DSP-3091 đã được thụ lý")
                .message("Ban Thẩm định đang rà soát giải tỏa hotline 091.234.8899, tạm hạ 70% mức cảnh báo.")
                .referenceId(3091L)
                .isRead(false)
                .createdAt(fixedNow.minusHours(1))
                .build();

        Notification n3 = Notification.builder()
                .id(3L)
                .user(user)
                .type(NotificationType.SYSTEM)
                .title("Bạn đã đủ điều kiện nâng cấp Sentinel Lv.3")
                .message("Đã tích lũy đủ 700/700 Điểm Sentinel. Mở rộng hạn mức tra cứu AI lên 100 lượt/ngày.")
                .referenceId(3L)
                .isRead(false)
                .createdAt(fixedNow.minusHours(3))
                .build();

        Notification n4 = Notification.builder()
                .id(4L)
                .user(user)
                .type(NotificationType.REPORT)
                .title("Báo cáo #RPT-8411 được gộp vào hồ sơ Forex")
                .message("Ảnh chứng từ của bạn đã liên kết vào hồ sơ FX-VIETNAM-CRIME-2025 (+25 điểm đối soát).")
                .referenceId(8411L)
                .isRead(true)
                .createdAt(fixedNow.minusDays(1))
                .build();

        Notification n5 = Notification.builder()
                .id(5L)
                .user(user)
                .type(NotificationType.DISPUTE)
                .title("Đã gỡ bỏ nhãn cảnh báo tên miền shop-chinhhang.vn")
                .message("Hồ sơ khiếu nại #DSP-2814 giải tỏa thành công sau xác thực giấy phép TMĐT.")
                .referenceId(2814L)
                .isRead(true)
                .createdAt(fixedNow.minusDays(3))
                .build();

        Notification n6 = Notification.builder()
                .id(6L)
                .user(user)
                .type(NotificationType.SYSTEM)
                .title("Cập nhật cơ sở dữ liệu phòng vệ ScamShield v4.8")
                .message("Đã tự động cập nhật 1.420 chữ ký độc hại và danh sách số điện thoại lừa đảo mới.")
                .isRead(true)
                .createdAt(fixedNow.minusDays(5))
                .build();

        when(notificationRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(n1, n2, n3, n4, n5, n6), PageRequest.of(0, 10), 12));

        when(notificationRepository.countByUserId(userId)).thenReturn(12L);
        when(notificationRepository.countByUserIdAndType(userId, NotificationType.REPORT)).thenReturn(6L);
        when(notificationRepository.countByUserIdAndType(userId, NotificationType.DISPUTE)).thenReturn(2L);
        when(notificationRepository.countByUserIdAndType(userId, NotificationType.SYSTEM)).thenReturn(4L);
        when(notificationRepository.countByUserIdAndIsReadFalse(userId)).thenReturn(3L);

        NotificationListResponse response = service.getNotifications(userId, "ALL", null, PageRequest.of(0, 10));

        assertThat(response.getNotifications().getData()).hasSize(6);

        // Item 1: Report approved
        NotificationItemResponse item1 = response.getNotifications().getData().get(0);
        assertThat(item1.getId()).isEqualTo(1L);
        assertThat(item1.getTitle()).isEqualTo("Báo cáo #RPT-8492 đã được phê duyệt");
        assertThat(item1.getTime()).isEqualTo("15 phút trước");
        assertThat(item1.isUnread()).isTrue();
        assertThat(item1.getDotColor()).isEqualTo("bg-emerald-500");
        assertThat(item1.getIcon()).isEqualTo("SealCheck");
        assertThat(item1.getIconColor()).isEqualTo("text-emerald-500");

        // Item 2: Dispute in progress
        NotificationItemResponse item2 = response.getNotifications().getData().get(1);
        assertThat(item2.getTitle()).isEqualTo("Hồ sơ khiếu nại #DSP-3091 đã được thụ lý");
        assertThat(item2.getTime()).isEqualTo("1 giờ trước");
        assertThat(item2.isUnread()).isTrue();
        assertThat(item2.getDotColor()).isEqualTo("bg-indigo-500");
        assertThat(item2.getIcon()).isEqualTo("Scales");

        // Item 3: Sentinel Level Up
        NotificationItemResponse item3 = response.getNotifications().getData().get(2);
        assertThat(item3.getTitle()).isEqualTo("Bạn đã đủ điều kiện nâng cấp Sentinel Lv.3");
        assertThat(item3.getTime()).isEqualTo("3 giờ trước");
        assertThat(item3.isUnread()).isTrue();
        assertThat(item3.getDotColor()).isEqualTo("bg-amber-500");
        assertThat(item3.getIcon()).isEqualTo("Medal");

        // Item 4: Report Merged (Read)
        NotificationItemResponse item4 = response.getNotifications().getData().get(3);
        assertThat(item4.getTitle()).isEqualTo("Báo cáo #RPT-8411 được gộp vào hồ sơ Forex");
        assertThat(item4.getTime()).isEqualTo("Hôm qua");
        assertThat(item4.isUnread()).isFalse();
        assertThat(item4.getDotColor()).isNull();
        assertThat(item4.getIcon()).isEqualTo("TreeStructure");

        // Item 5: Dispute resolved (Read)
        NotificationItemResponse item5 = response.getNotifications().getData().get(4);
        assertThat(item5.getTitle()).isEqualTo("Đã gỡ bỏ nhãn cảnh báo tên miền shop-chinhhang.vn");
        assertThat(item5.getTime()).isEqualTo("3 ngày trước");
        assertThat(item5.isUnread()).isFalse();
        assertThat(item5.getDotColor()).isNull();
        assertThat(item5.getIcon()).isEqualTo("CheckCircle");

        // Item 6: System DB update (Read)
        NotificationItemResponse item6 = response.getNotifications().getData().get(5);
        assertThat(item6.getTitle()).isEqualTo("Cập nhật cơ sở dữ liệu phòng vệ ScamShield v4.8");
        assertThat(item6.getTime()).isEqualTo("5 ngày trước");
        assertThat(item6.isUnread()).isFalse();
        assertThat(item6.getDotColor()).isNull();
        assertThat(item6.getIcon()).isEqualTo("DeviceMobile");

        // Tab counts
        assertThat(response.getTabCounts().getAll()).isEqualTo(12L);
        assertThat(response.getTabCounts().getReport()).isEqualTo(6L);
        assertThat(response.getTabCounts().getDispute()).isEqualTo(2L);
        assertThat(response.getTabCounts().getSystem()).isEqualTo(4L);
        assertThat(response.getTabCounts().getUnread()).isEqualTo(3L);
    }

    @Test
    void formatRelativeTimeCalculatesAccurately() {
        assertThat(service.formatRelativeTime(fixedNow.minusSeconds(30), fixedNow)).isEqualTo("Vừa xong");
        assertThat(service.formatRelativeTime(fixedNow.minusMinutes(15), fixedNow)).isEqualTo("15 phút trước");
        assertThat(service.formatRelativeTime(fixedNow.minusHours(1), fixedNow)).isEqualTo("1 giờ trước");
        assertThat(service.formatRelativeTime(fixedNow.minusHours(3), fixedNow)).isEqualTo("3 giờ trước");
        assertThat(service.formatRelativeTime(fixedNow.minusDays(1), fixedNow)).isEqualTo("Hôm qua");
        assertThat(service.formatRelativeTime(fixedNow.minusDays(3), fixedNow)).isEqualTo("3 ngày trước");
        assertThat(service.formatRelativeTime(fixedNow.minusDays(5), fixedNow)).isEqualTo("5 ngày trước");
        assertThat(service.formatRelativeTime(fixedNow.minusDays(14), fixedNow)).isEqualTo("2 tuần trước");
        assertThat(service.formatRelativeTime(fixedNow.minusDays(60), fixedNow)).isEqualTo("2 tháng trước");
    }

    @Test
    void getTabCountsCallsRepositoryProperly() {
        Long userId = 1L;
        when(notificationRepository.countByUserId(userId)).thenReturn(12L);
        when(notificationRepository.countByUserIdAndType(userId, NotificationType.REPORT)).thenReturn(6L);
        when(notificationRepository.countByUserIdAndType(userId, NotificationType.DISPUTE)).thenReturn(2L);
        when(notificationRepository.countByUserIdAndType(userId, NotificationType.SYSTEM)).thenReturn(4L);
        when(notificationRepository.countByUserIdAndIsReadFalse(userId)).thenReturn(3L);

        NotificationTabCountsResponse counts = service.getTabCounts(userId);

        assertThat(counts.getAll()).isEqualTo(12L);
        assertThat(counts.getReport()).isEqualTo(6L);
        assertThat(counts.getDispute()).isEqualTo(2L);
        assertThat(counts.getSystem()).isEqualTo(4L);
        assertThat(counts.getUnread()).isEqualTo(3L);
    }

    @Test
    void getUnreadCountReturnsAccurateNumber() {
        Long userId = 1L;
        when(notificationRepository.countByUserIdAndIsReadFalse(userId)).thenReturn(3L);

        long unread = service.getUnreadCount(userId);

        assertThat(unread).isEqualTo(3L);
    }

    @Test
    void markAllAsReadCallsRepository() {
        Long userId = 1L;
        service.markAllAsRead(userId);

        verify(notificationRepository).markAllAsRead(eq(userId), any());
    }

    @Test
    void markAsReadCallsRepository() {
        Long userId = 1L;
        Long notifId = 42L;
        service.markAsRead(userId, notifId);

        verify(notificationRepository).markAsRead(eq(notifId), eq(userId), any());
    }
}
