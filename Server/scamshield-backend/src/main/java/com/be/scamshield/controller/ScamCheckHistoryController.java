package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.response.ScamCheckHistoryResponse;
import com.be.scamshield.dto.response.ScamCheckRiskCountsResponse;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IScamCheckHistoryService;
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

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping({"/api/scam-check/history", "/api/user/scam-check/history", "/api/history"})
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Scam Check History", description = "API lịch sử kiểm tra lừa đảo và nhật ký truy vấn của người dùng")
public class ScamCheckHistoryController {

    private final IScamCheckHistoryService scamCheckHistoryService;

    @GetMapping
    @Operation(summary = "Lấy danh sách lịch sử kiểm tra lừa đảo",
            description = "Hỗ trợ tìm kiếm từ khóa (search), lọc theo khoảng thời gian (timeRange: 7_days, 30_days, 90_days, all), "
                    + "hình thức thủ đoạn (scamType: all, telecom, malware, banking, forex) và phân loại rủi ro (riskStatus: ALL, DANGEROUS, SUSPICIOUS, SAFE, UNKNOWN). "
                    + "Trả về danh sách truy vấn phân trang kèm thống kê đếm số lượng cho 4 nhóm rủi ro.")
    public ResponseEntity<BaseResponse<ScamCheckHistoryResponse>> getCheckHistory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "Từ khóa tìm kiếm (nội dung tin nhắn, số điện thoại, URL...)")
            @RequestParam(required = false) String search,
            @Parameter(description = "Khoảng thời gian (7_days, 30_days, 90_days, all)")
            @RequestParam(required = false, defaultValue = "all") String timeRange,
            @Parameter(description = "Hình thức thủ đoạn (all, telecom, malware, banking, forex)")
            @RequestParam(required = false, defaultValue = "all") String scamType,
            @Parameter(description = "Phân loại rủi ro (ALL, DANGEROUS, SUSPICIOUS, SAFE, UNKNOWN)")
            @RequestParam(required = false, defaultValue = "ALL") String riskStatus,
            @Parameter(description = "Số trang (bắt đầu từ 0)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang (tối đa 100)")
            @RequestParam(defaultValue = "10") int size) {

        Long userId = requireUserId(userPrincipal);

        if (page < 0) {
            throw new BadRequestException("Page index must not be less than zero");
        }
        if (size < 1) {
            throw new BadRequestException("Page size must not be less than one");
        }
        int cappedSize = Math.min(size, 100);

        Pageable pageable = PageRequest.of(page, cappedSize, Sort.by(Sort.Direction.DESC, "createdAt"));
        ScamCheckHistoryResponse response = scamCheckHistoryService.getCheckHistory(
                userId, search, timeRange, scamType, riskStatus, pageable);

        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy lịch sử kiểm tra thành công", response));
    }

    @GetMapping("/risk-counts")
    @Operation(summary = "Lấy số lượng phân loại rủi ro",
            description = "Trả về số lượng truy vấn theo 4 mức độ: Tất cả, Lừa đảo nguy cơ cao, Nghi vấn rủi ro, An toàn chính hãng, Chưa xác định")
    public ResponseEntity<BaseResponse<ScamCheckRiskCountsResponse>> getRiskCounts(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {

        Long userId = requireUserId(userPrincipal);
        ScamCheckRiskCountsResponse counts = scamCheckHistoryService.getRiskCounts(userId);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy thống kê rủi ro thành công", counts));
    }

    @DeleteMapping
    @Operation(summary = "Xóa lịch sử kiểm tra đã chọn",
            description = "Thực hiện ẩn/xóa mềm (soft delete) danh sách các bản ghi lịch sử truy vấn theo ID")
    public ResponseEntity<BaseResponse<Void>> deleteHistory(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) List<Long> ids,
            @RequestBody(required = false) List<Long> bodyIds) {

        Long userId = requireUserId(userPrincipal);
        List<Long> combinedIds = new ArrayList<>();
        if (ids != null) {
            combinedIds.addAll(ids);
        }
        if (bodyIds != null) {
            combinedIds.addAll(bodyIds);
        }

        scamCheckHistoryService.deleteHistoryItems(userId, combinedIds);
        return ResponseEntity.ok(new BaseResponse<>(true, "Xóa lịch sử kiểm tra thành công", null));
    }

    private Long requireUserId(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để thực hiện thao tác");
        }
        return principal.getId();
    }
}
