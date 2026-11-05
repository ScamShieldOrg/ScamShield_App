package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.response.NotificationListResponse;
import com.be.scamshield.dto.response.NotificationTabCountsResponse;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.INotificationService;
import com.be.scamshield.serviceImpl.NotificationStreamService;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.http.MediaType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping({"/api/notifications", "/api/user/notifications"})
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Notifications", description = "API quản lý và truy vấn thông báo hệ thống cho người dùng")
public class NotificationController {

    private final INotificationService notificationService;
    private final NotificationStreamService notificationStreams;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "Nhận tín hiệu thông báo realtime", description = "SSE có xác thực; mỗi sự kiện chứa BaseResponse. Kết nối tối đa 60 giây, client tự nối lại.")
    public ResponseEntity<SseEmitter> stream(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok().header("Cache-Control", "no-cache")
                .header("X-Accel-Buffering", "no").body(notificationStreams.subscribe(requireUserId(principal)));
    }


    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo hệ thống",
            description = "Trả về danh sách thông báo phân trang kèm số lượng đếm theo từng tab (Tất cả, Báo cáo, Khiếu nại, Hệ thống). "
                    + "Hỗ trợ lọc theo loại (type: ALL, REPORT, DISPUTE, SYSTEM) và trạng thái chưa đọc (unreadOnly: true/false).")
    public ResponseEntity<BaseResponse<NotificationListResponse>> getNotifications(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "Loại thông báo: ALL, REPORT, DISPUTE, SYSTEM")
            @RequestParam(required = false, defaultValue = "ALL") String type,
            @Parameter(description = "Chỉ lấy thông báo chưa đọc")
            @RequestParam(required = false) Boolean unreadOnly,
            @Parameter(description = "Số trang (bắt đầu từ 0)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang (tối đa 100)")
            @RequestParam(defaultValue = "10") int size) {

        Long userId = requireUserId(userPrincipal);

        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page index must not be less than zero");
        }
        if (size < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must not be less than one");
        }
        int cappedSize = Math.min(size, 100);

        Pageable pageable = PageRequest.of(page, cappedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        NotificationListResponse response = notificationService.getNotifications(userId, type, unreadOnly, pageable);

        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách thông báo thành công", response));
    }

    @GetMapping("/tab-counts")
    @Operation(summary = "Lấy số lượng thông báo theo từng tab",
            description = "Trả về tổng số thông báo theo các nhóm: Tất cả, Báo cáo, Khiếu nại, Hệ thống và số lượng chưa đọc")
    public ResponseEntity<BaseResponse<NotificationTabCountsResponse>> getTabCounts(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        Long userId = requireUserId(userPrincipal);
        NotificationTabCountsResponse counts = notificationService.getTabCounts(userId);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy số lượng thông báo thành công", counts));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số lượng thông báo chưa đọc",
            description = "Dùng cho badge hiển thị số lượng chưa đọc trên chuông thông báo (Header/Sidebar)")
    public ResponseEntity<BaseResponse<Long>> getUnreadCount(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        Long userId = requireUserId(userPrincipal);
        long unreadCount = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy số lượng thông báo chưa đọc thành công", unreadCount));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Đánh dấu tất cả thông báo là đã đọc",
            description = "Cập nhật trạng thái isRead = true cho toàn bộ thông báo của người dùng")
    public ResponseEntity<BaseResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        Long userId = requireUserId(userPrincipal);
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(new BaseResponse<>(true, "Đánh dấu tất cả thông báo đã đọc thành công", null));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo là đã đọc",
            description = "Cập nhật trạng thái isRead = true cho một thông báo cụ thể theo ID")
    public ResponseEntity<BaseResponse<Void>> markAsRead(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long id) {

        Long userId = requireUserId(userPrincipal);
        notificationService.markAsRead(userId, id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Đánh dấu thông báo đã đọc thành công", null));
    }

    private Long requireUserId(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác");
        }
        return principal.getId();
    }
}
