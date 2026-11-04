package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.ModeratorDecisionRequest;
import com.be.scamshield.dto.request.ModeratorReportFilterRequest;
import com.be.scamshield.dto.response.ModeratorQueueCountsResponse;
import com.be.scamshield.dto.response.ModeratorReportResponse;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IModeratorReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;

@RestController
@RequestMapping("/api/moderator/reports")
@RequiredArgsConstructor
@Tag(name = "Moderator Report Queue", description = "API quản lý hàng đợi xét duyệt báo cáo lừa đảo dành cho kiểm duyệt viên")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasAnyRole('MODERATOR', 'ADMINISTRATOR')")
public class ModeratorReportController {

    private static final Set<String> ALLOWED_SORT_PROPERTIES = Set.of(
            "id",
            "createdAt",
            "updatedAt",
            "status"
    );

    private final IModeratorReportService moderatorReportService;

    @GetMapping
    @Operation(summary = "Lấy danh sách hàng đợi xét duyệt báo cáo lừa đảo",
            description = "Hỗ trợ phân trang, tìm kiếm theo ID (CS-YYYY-XXXX), đối tượng, danh mục, người gửi; lọc theo tab (ALL, PENDING, IN_REVIEW)")
    public ResponseEntity<BaseResponse<PaginatedResponse<ModeratorReportResponse>>> getReportQueue(
            @Valid @ModelAttribute @ParameterObject ModeratorReportFilterRequest filter) {

        Pageable pageable = createPageable(filter);
        PaginatedResponse<ModeratorReportResponse> reports = moderatorReportService.getReportQueue(filter, pageable);

        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách hàng đợi xét duyệt thành công", reports));
    }

    @GetMapping("/counts")
    @Operation(summary = "Lấy số lượng hồ sơ theo từng tab trong hàng đợi",
            description = "Trả về tổng số ca, số ca đang chờ duyệt (Pending) và đang xem xét (In Review)")
    public ResponseEntity<BaseResponse<ModeratorQueueCountsResponse>> getQueueCounts() {
        ModeratorQueueCountsResponse counts = moderatorReportService.getQueueCounts();
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy số lượng hàng đợi xét duyệt thành công", counts));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một ca báo cáo lừa đảo",
            description = "Trả về thông tin chi tiết của một ca báo cáo theo ID bao gồm đối tượng, danh mục, bằng chứng, người báo cáo và mức độ ưu tiên")
    public ResponseEntity<BaseResponse<ModeratorReportResponse>> getReportById(
            @Parameter(description = "ID gốc của hồ sơ báo cáo (ví dụ: 1891)")
            @PathVariable Long id) {
        ModeratorReportResponse report = moderatorReportService.getReportById(id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết hồ sơ báo cáo thành công", report));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Kiểm duyệt viên ra quyết định thẩm định ca báo cáo",
            description = "Phê duyệt (APPROVE) hoặc từ chối (REJECT). Khi ra quyết định, tất cả các báo cáo PENDING của cùng một đối tượng (Indicator) sẽ được xử lý đồng bộ cùng lúc. Yêu cầu lý do tối thiểu 20 ký tự để lưu vết audit trail bất biến.")
    public ResponseEntity<BaseResponse<ModeratorReportResponse>> submitDecision(
            @Parameter(description = "ID gốc của hồ sơ báo cáo (ví dụ: 1891)")
            @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody ModeratorDecisionRequest request) {

        ModeratorReportResponse response = moderatorReportService.makeDecision(id, currentUser, request);
        return ResponseEntity.ok(new BaseResponse<>(true, "Xác nhận quyết định kiểm duyệt thành công", response));
    }

    private Pageable createPageable(ModeratorReportFilterRequest filter) {
        if (filter.getPage() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page index must not be less than zero");
        }
        if (filter.getSize() < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Page size must not be less than one");
        }
        int cappedSize = Math.min(filter.getSize(), 100);

        String sort = filter.getSort();
        if (sort == null || sort.trim().isEmpty()) {
            sort = "createdAt,desc";
        }

        String[] sortParams = sort.split(",");
        Sort.Direction direction = (sortParams.length > 1 && "asc".equalsIgnoreCase(sortParams[1].trim()))
                ? Sort.Direction.ASC
                : Sort.Direction.DESC;
        String sortProperty = sortParams[0].trim();
        if (!ALLOWED_SORT_PROPERTIES.contains(sortProperty)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported sort field: " + sortProperty);
        }

        return PageRequest.of(filter.getPage(), cappedSize, Sort.by(direction, sortProperty));
    }
}
