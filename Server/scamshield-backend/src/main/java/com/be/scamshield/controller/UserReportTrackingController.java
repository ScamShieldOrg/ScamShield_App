package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.UpdateOwnReportRequest;
import com.be.scamshield.service.IOwnReportService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.*;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IUserReportTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/user/reports")
@RequiredArgsConstructor
@Tag(name = "User Report Tracking", description = "API theo dõi tiến trình và thống kê các báo cáo lừa đảo do người dùng gửi")
@SecurityRequirement(name = "bearerAuth")
public class UserReportTrackingController {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "id",
            "createdAt",
            "updatedAt",
            "status",
            "reportedMessage",
            "description",
            "regionCode"
    );

    private final IUserReportTrackingService reportTrackingService;
    private final IOwnReportService ownReportService;

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Cập nhật báo cáo của tôi trước kiểm duyệt",
            description = "Chỉ PENDING và chưa có lịch sử kiểm duyệt. Không đổi đối tượng bị báo cáo. evidences=null giữ nguyên; danh sách mới thay thế bằng chứng cũ. Trả 409 nếu đã bắt đầu duyệt.")
    public ResponseEntity<BaseResponse<ReportDetailTrackingResponse>> updateOwnReport(
            @PathVariable Long id, @Valid @RequestBody UpdateOwnReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Cập nhật báo cáo thành công", ownReportService.update(id, request, principal)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Thu hồi báo cáo của tôi trước kiểm duyệt", description = "Chuyển PENDING sang WITHDRAWN, giữ dữ liệu và audit; không xóa báo cáo.")
    public ResponseEntity<BaseResponse<Void>> withdrawOwnReport(@PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal principal) {
        ownReportService.withdraw(id, principal);
        return ResponseEntity.ok(new BaseResponse<>(true, "Thu hồi báo cáo thành công", null));
    }

    @GetMapping("/metrics")
    @Operation(summary = "Lấy thống kê tổng quan (4 metric cards)", description = "Trả về tổng báo cáo, số báo cáo 7 ngày qua, đã duyệt blacklist, bảo vệ truy vấn, tỷ lệ chính xác, rank title, điểm uy tín và tiến trình cấp độ")
    public ResponseEntity<BaseResponse<ReportSummaryMetricsResponse>> getSummaryMetrics(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        ensureAuthenticated(userPrincipal);
        ReportSummaryMetricsResponse metrics = reportTrackingService.getSummaryMetrics(userPrincipal.getId());
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy thống kê tổng quan thành công", metrics));
    }

    @GetMapping("/status-counts")
    @Operation(summary = "Lấy số lượng báo cáo theo từng trạng thái", description = "Phục vụ các badge/pill số lượng: Tất cả, Đang chờ duyệt, Đã vào Blacklist, Đã gộp trùng lặp, Bị từ chối")
    public ResponseEntity<BaseResponse<ReportStatusCountsResponse>> getStatusCounts(
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        ensureAuthenticated(userPrincipal);
        ReportStatusCountsResponse counts = reportTrackingService.getStatusCounts(userPrincipal.getId());
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy số lượng trạng thái thành công", counts));
    }

    @GetMapping("/tracking")
    @Operation(summary = "Lấy danh sách theo dõi tiến trình phê duyệt", description = "Hỗ trợ phân trang, tìm kiếm mã #RPT / SĐT / STK / URL, lọc theo trạng thái, danh mục thủ đoạn và thời gian")
    public ResponseEntity<BaseResponse<PaginatedResponse<TrackingReportResponse>>> getTrackingReports(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @Parameter(description = "Từ khóa tìm kiếm (Mã #RPT, Số điện thoại, STK, Tên miền...)")
            @RequestParam(required = false) String search,
            @Parameter(description = "Trạng thái báo cáo (ALL, PENDING, APPROVED, REJECTED)")
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @Parameter(description = "ID danh mục thủ đoạn")
            @RequestParam(required = false) Long categoryId,
            @Parameter(description = "Lọc trong số ngày gần nhất (ví dụ: 7, 30, 90)")
            @RequestParam(required = false) Integer days,
            @Parameter(description = "Số trang (bắt đầu từ 0)")
            @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang")
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Trường sắp xếp (ví dụ: createdAt,desc)")
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        ensureAuthenticated(userPrincipal);

        if (page < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page index must not be less than zero");
        }
        if (size < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must not be less than one");
        }
        int cappedSize = Math.min(size, 100);

        String[] sortParams = sort.split(",");
        Sort.Direction direction = (sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        String sortProperty = sortParams[0].trim();
        if (!ALLOWED_SORT_PROPERTIES.contains(sortProperty)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sort field: " + sortProperty);
        }
        Pageable pageable = PageRequest.of(page, cappedSize, Sort.by(direction, sortProperty));

        PaginatedResponse<TrackingReportResponse> reports = reportTrackingService.getTrackingReports(
                userPrincipal.getId(), search, status, categoryId, days, pageable);

        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách báo cáo thành công", reports));
    }

    @GetMapping("/export-csv")
    @Operation(summary = "Xuất đối soát danh sách báo cáo ra file CSV", description = "Tải về tệp CSV mã hóa UTF-8 với BOM tương thích Excel")
    public ResponseEntity<byte[]> exportCsv(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Integer days) {

        ensureAuthenticated(userPrincipal);

        byte[] csvData = reportTrackingService.exportTrackingReportsCsv(
                userPrincipal.getId(), search, status, categoryId, days);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"scamshield_report_tracking.csv\"")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(csvData);
    }

    @GetMapping("/categories")
    @Operation(summary = "Lấy danh mục thủ đoạn lừa đảo", description = "Phục vụ dropdown bộ lọc danh mục thủ đoạn")
    public ResponseEntity<BaseResponse<List<ScamCategoryResponse>>> getCategories() {
        List<ScamCategoryResponse> categories = reportTrackingService.getCategories();
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh mục thành công", categories));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết tiến trình một báo cáo", description = "Xem chi tiết đối soát, lịch sử thẩm định và danh sách bằng chứng")
    public ResponseEntity<BaseResponse<ReportDetailTrackingResponse>> getReportDetail(
            @AuthenticationPrincipal UserPrincipal userPrincipal,
            @PathVariable Long id) {

        ensureAuthenticated(userPrincipal);
        ReportDetailTrackingResponse detail = reportTrackingService.getReportDetail(userPrincipal.getId(), id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết báo cáo thành công", detail));
    }

    private void ensureAuthenticated(UserPrincipal userPrincipal) {
        if (userPrincipal == null || userPrincipal.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập để truy cập tính năng theo dõi báo cáo");
        }
    }
}
