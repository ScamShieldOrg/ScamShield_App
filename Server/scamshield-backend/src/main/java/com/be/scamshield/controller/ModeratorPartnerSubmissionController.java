package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionCountsResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionFilterRequest;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.ReviewPartnerSubmissionRequest;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerSubmissionService;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/moderator/partner-submissions")
@RequiredArgsConstructor
@Tag(name = "Moderator Partner Submission Review", description = "API quản lý hàng đợi xét duyệt cảnh báo và thông tin tình báo đối tác dành cho kiểm duyệt viên")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('MODERATOR')")
public class ModeratorPartnerSubmissionController {

    private final IPartnerSubmissionService partnerSubmissionService;

    @GetMapping
    @Operation(summary = "Lấy danh sách hàng đợi xét duyệt cảnh báo / tình báo từ đối tác",
            description = "Hỗ trợ phân trang, lọc theo trạng thái (ALL, PENDING, VERIFIED, REJECTED), loại hồ sơ (SCAM_ALERT, THREAT_INTEL) và tìm kiếm theo từ khóa.")
    public ResponseEntity<BaseResponse<PaginatedResponse<PartnerSubmissionResponse>>> getQueue(
            @Valid @ModelAttribute @ParameterObject PartnerSubmissionFilterRequest filter) {

        Pageable pageable = createPageable(filter);
        PaginatedResponse<PartnerSubmissionResponse> response = partnerSubmissionService.getModeratorQueue(filter, pageable);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách hàng đợi xét duyệt thành công", response));
    }

    @GetMapping("/counts")
    @Operation(summary = "Lấy số lượng hồ sơ theo từng trạng thái trong hàng đợi")
    public ResponseEntity<BaseResponse<PartnerSubmissionCountsResponse>> getQueueCounts() {
        PartnerSubmissionCountsResponse counts = partnerSubmissionService.getQueueCounts();
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy thống kê hàng đợi thành công", counts));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy thông tin chi tiết một ca cảnh báo / tình báo đối tác theo ID")
    public ResponseEntity<BaseResponse<PartnerSubmissionResponse>> getById(
            @Parameter(description = "ID hồ sơ") @PathVariable Long id) {

        PartnerSubmissionResponse response = partnerSubmissionService.getSubmissionDetailForModerator(id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết hồ sơ thành công", response));
    }

    @PutMapping(value = {"/{id}/review", "/{id}/decision"})
    @Operation(summary = "Kiểm duyệt viên ra quyết định thẩm định (VERIFY hoặc REJECT)",
            description = "Khi thẩm định VERIFY: chỉ số sẽ được cập nhật (nếu đã tồn tại) hoặc tạo mới (candidate) và được xác nhận (CONFIRMED) vào Blacklist. Nếu là cảnh báo chính thức sẽ đồng thời xuất bản Official Scam Warning.")
    public ResponseEntity<BaseResponse<PartnerSubmissionResponse>> review(
            @Parameter(description = "ID hồ sơ") @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser,
            @Valid @RequestBody ReviewPartnerSubmissionRequest request) {

        PartnerSubmissionResponse response = partnerSubmissionService.reviewSubmission(id, request, currentUser);
        return ResponseEntity.ok(new BaseResponse<>(true, "Xác nhận quyết định kiểm duyệt thành công", response));
    }

    @GetMapping("/{id}/evidence")
    @Operation(summary = "Kiểm duyệt viên tải tệp bằng chứng của hồ sơ")
    public ResponseEntity<byte[]> downloadEvidence(
            @Parameter(description = "ID hồ sơ") @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        PartnerDocument document = partnerSubmissionService.getSubmissionEvidence(id, currentUser);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + document.getFileName() + "\"")
                .contentType(MediaType.parseMediaType(document.getContentType()))
                .contentLength(document.getFileSize())
                .body(document.getContent());
    }

    private Pageable createPageable(PartnerSubmissionFilterRequest filter) {
        int page = filter != null && filter.getPage() >= 0 ? filter.getPage() : 0;
        int size = filter != null && filter.getSize() >= 1 ? Math.min(filter.getSize(), 100) : 10;
        String sortBy = filter != null && filter.getSortBy() != null ? filter.getSortBy() : "createdAt";
        Sort.Direction direction = filter != null && "ASC".equalsIgnoreCase(filter.getSortDirection())
                ? Sort.Direction.ASC : Sort.Direction.DESC;

        return PageRequest.of(page, size, Sort.by(direction, sortBy));
    }
}
