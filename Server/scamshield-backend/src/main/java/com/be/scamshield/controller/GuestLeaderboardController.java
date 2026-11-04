package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.response.GuestLeaderboardResponse;
import com.be.scamshield.service.IGuestLeaderboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/guest/leaderboard", "/api/leaderboard"})
@RequiredArgsConstructor
@Tag(name = "Guest Leaderboard", description = "Bảng vinh danh đóng góp cộng đồng cho khách vãng lai và người dùng công khai")
public class GuestLeaderboardController {

    private final IGuestLeaderboardService guestLeaderboardService;

    @GetMapping
    @Operation(summary = "Lấy dữ liệu Bảng Vinh Danh Đóng Góp Cộng Đồng",
            description = "Trả về 4 thẻ thống kê vinh danh (chuyên gia kích hoạt, mối đe dọa vô hiệu hóa, độ chính xác xác minh, thời gian phản ứng TB), "
                    + "Top 3 vinh danh toàn quốc ẩn danh (Zero PII), bảng xếp hạng chi tiết (hạng 4 – 10) và danh sách bộ lọc thời gian. "
                    + "Hỗ trợ lọc timeRange: ALL_TIME (Mọi lúc), THIS_MONTH (Tháng hiện tại), LAST_7_DAYS (7 ngày qua).")
    public ResponseEntity<BaseResponse<GuestLeaderboardResponse>> getLeaderboard(
            @Parameter(description = "Khoảng thời gian (ALL_TIME, THIS_MONTH, LAST_7_DAYS)")
            @RequestParam(required = false, defaultValue = "THIS_MONTH") String timeRange) {

        GuestLeaderboardResponse response = guestLeaderboardService.getLeaderboard(timeRange);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy dữ liệu bảng vinh danh thành công", response));
    }
}
