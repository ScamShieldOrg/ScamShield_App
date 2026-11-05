package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.NotificationType;
import com.be.scamshield.exception.BadRequestException;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.NotificationItemResponse;
import com.be.scamshield.dto.response.NotificationListResponse;
import com.be.scamshield.dto.response.NotificationTabCountsResponse;
import com.be.scamshield.entity.Notification;
import com.be.scamshield.repository.NotificationRepository;
import com.be.scamshield.service.INotificationService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements INotificationService {

    private final NotificationRepository notificationRepository;
    private final Clock applicationClock;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    @Override
    @Transactional(readOnly = true)
    public NotificationListResponse getNotifications(Long userId, String type, Boolean unreadOnly, Pageable pageable) {
        Specification<Notification> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));

            if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type.trim())) {
                predicates.add(cb.equal(root.get("type"), parseNotificationType(type)));
            }

            if (Boolean.TRUE.equals(unreadOnly)) {
                predicates.add(cb.equal(root.get("isRead"), false));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Notification> page = notificationRepository.findAll(spec, pageable);
        LocalDateTime now = LocalDateTime.now(applicationClock);

        List<NotificationItemResponse> items = page.getContent().stream()
                .map(n -> mapToItemResponse(n, now))
                .toList();

        PaginatedResponse<NotificationItemResponse> paginated = new PaginatedResponse<>();
        paginated.setData(items);
        paginated.setCurrentPage(page.getNumber());
        paginated.setPageSize(page.getSize());
        paginated.setTotalItems(page.getTotalElements());
        paginated.setTotalPages(page.getTotalPages());
        paginated.setHasNext(page.hasNext());
        paginated.setHasPrevious(page.hasPrevious());

        NotificationTabCountsResponse tabCounts = getTabCounts(userId);

        return NotificationListResponse.builder()
                .notifications(paginated)
                .tabCounts(tabCounts)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationTabCountsResponse getTabCounts(Long userId) {
        long allCount = notificationRepository.countByUserId(userId);
        long reportCount = notificationRepository.countByUserIdAndType(userId, NotificationType.REPORT);
        long disputeCount = notificationRepository.countByUserIdAndType(userId, NotificationType.DISPUTE);
        long systemCount = notificationRepository.countByUserIdAndType(userId, NotificationType.SYSTEM);
        long unreadCount = notificationRepository.countByUserIdAndIsReadFalse(userId);

        return NotificationTabCountsResponse.builder()
                .all(allCount)
                .report(reportCount)
                .dispute(disputeCount)
                .system(systemCount)
                .unread(unreadCount)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId, LocalDateTime.now(applicationClock));
    }

    @Override
    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        notificationRepository.markAsRead(notificationId, userId, LocalDateTime.now(applicationClock));
    }

    private NotificationItemResponse mapToItemResponse(Notification n, LocalDateTime now) {
        boolean unread = !Boolean.TRUE.equals(n.getIsRead());
        VisualMeta meta = resolveVisualMeta(n, unread);
        String relativeTime = formatRelativeTime(n.getCreatedAt(), now);

        return NotificationItemResponse.builder()
                .id(n.getId())
                .title(n.getTitle())
                .desc(n.getMessage())
                .message(n.getMessage())
                .time(relativeTime)
                .createdAt(n.getCreatedAt())
                .unread(unread)
                .isRead(Boolean.TRUE.equals(n.getIsRead()))
                .type(n.getType())
                .referenceId(n.getReferenceId())
                .dotColor(meta.dotColor())
                .icon(meta.icon())
                .iconBg(meta.iconBg())
                .iconColor(meta.iconColor())
                .build();
    }

    private VisualMeta resolveVisualMeta(Notification n, boolean unread) {
        String type = n.getType() != null ? n.getType().name() : "SYSTEM";
        String title = n.getTitle() != null ? n.getTitle() : "";

        String dotColor = null;
        String icon = "Bell";
        String iconBg = "bg-slate-100 dark:bg-slate-800";
        String iconColor = "text-slate-500 dark:text-slate-400";

        if ("REPORT".equals(type)) {
            if (title.contains("gộp") || title.contains("trùng")) {
                icon = "TreeStructure";
                iconBg = "bg-slate-100 dark:bg-slate-800";
                iconColor = "text-slate-500 dark:text-slate-400";
                if (unread) dotColor = "bg-purple-500";
            } else {
                icon = "SealCheck";
                iconBg = "bg-emerald-50 dark:bg-emerald-900/30";
                iconColor = "text-emerald-500";
                if (unread) dotColor = "bg-emerald-500";
            }
        } else if ("DISPUTE".equals(type)) {
            if (title.contains("gỡ") || title.contains("thành công") || title.contains("chấp thuận")) {
                icon = "CheckCircle";
                iconBg = "bg-blue-50 dark:bg-blue-900/30";
                iconColor = "text-blue-500";
                if (unread) dotColor = "bg-blue-500";
            } else {
                icon = "Scales";
                iconBg = "bg-indigo-50 dark:bg-indigo-900/30";
                iconColor = "text-indigo-500";
                if (unread) dotColor = "bg-indigo-500";
            }
        } else if ("SYSTEM".equals(type) || "RANK".equals(type)) {
            if (title.contains("nâng cấp") || title.contains("Sentinel") || title.contains("thưởng")
                    || "RANK".equals(type)) {
                icon = "Medal";
                iconBg = "bg-amber-50 dark:bg-amber-900/30";
                iconColor = "text-amber-500";
                if (unread) dotColor = "bg-amber-500";
            } else {
                icon = "DeviceMobile";
                iconBg = "bg-slate-100 dark:bg-slate-800";
                iconColor = "text-slate-500 dark:text-slate-400";
                if (unread) dotColor = "bg-blue-500";
            }
        }

        return new VisualMeta(icon, iconBg, iconColor, dotColor);
    }

    public String formatRelativeTime(LocalDateTime createdAt, LocalDateTime now) {
        if (createdAt == null) {
            return "";
        }
        if (now == null) {
            now = LocalDateTime.now(applicationClock);
        }

        Duration duration = Duration.between(createdAt, now);
        long seconds = duration.getSeconds();

        if (seconds < 60) {
            return "Vừa xong";
        }
        long minutes = duration.toMinutes();
        if (minutes < 60) {
            return minutes + " phút trước";
        }
        long hours = duration.toHours();
        if (hours < 24 && createdAt.toLocalDate().isEqual(now.toLocalDate())) {
            return hours + " giờ trước";
        }

        LocalDate createdDate = createdAt.toLocalDate();
        LocalDate nowDate = now.toLocalDate();
        long daysBetween = ChronoUnit.DAYS.between(createdDate, nowDate);

        if (daysBetween == 1) {
            return "Hôm qua";
        }
        if (daysBetween > 1 && daysBetween < 7) {
            return daysBetween + " ngày trước";
        }
        if (daysBetween >= 7 && daysBetween < 30) {
            long weeks = daysBetween / 7;
            return weeks + " tuần trước";
        }
        if (daysBetween >= 30 && daysBetween < 365) {
            long months = daysBetween / 30;
            return months + " tháng trước";
        }
        return createdAt.format(DATE_FORMATTER);
    }

    private record VisualMeta(String icon, String iconBg, String iconColor, String dotColor) {}
    private NotificationType parseNotificationType(String type) {
        try {
            return NotificationType.valueOf(type.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Loại thông báo không hợp lệ");
        }
    }}
