package com.be.scamshield.controller;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationCountsResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationDetailResponse;
import com.be.scamshield.dto.admin.AdminPartnerRegistrationItemResponse;
import com.be.scamshield.dto.admin.PartnerDocumentContentResponse;
import com.be.scamshield.dto.request.AdminPartnerReviewRequest;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.AdminPartnerRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/partner-registrations")
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasRole('ADMINISTRATOR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin partner registrations", description = "Xét duyệt hồ sơ đối tác và danh sách trắng")
public class AdminPartnerRegistrationController {
    private final AdminPartnerRegistrationService service;

    @GetMapping
    @Operation(summary = "Danh sách hồ sơ đối tác", description = "Tìm theo tên, MST, email hoặc chỉ số; trang bắt đầu từ 0, tối đa 100 hồ sơ/trang")
    public ResponseEntity<BaseResponse<PaginatedResponse<AdminPartnerRegistrationItemResponse>>> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) PartnerVerificationStatus status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "10") @Min(1) @Max(100) int size) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách hồ sơ đối tác thành công",
                service.list(search, status, page, size)));
    }

    @GetMapping("/counts")
    @Operation(summary = "Thống kê hồ sơ theo trạng thái")
    public ResponseEntity<BaseResponse<AdminPartnerRegistrationCountsResponse>> counts() {
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy thống kê hồ sơ thành công", service.counts()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết hồ sơ đối tác")
    public ResponseEntity<BaseResponse<AdminPartnerRegistrationDetailResponse>> detail(@PathVariable Long id) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết hồ sơ thành công", service.detail(id)));
    }

    @GetMapping("/{id}/documents/{documentId}")
    @Operation(summary = "Tải một tài liệu của hồ sơ", description = "Chỉ quản trị viên; trả nội dung Base64 trong BaseResponse")
    public ResponseEntity<BaseResponse<PartnerDocumentContentResponse>> document(
            @PathVariable Long id, @PathVariable Long documentId) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy tài liệu thành công", service.document(id, documentId)));
    }

    @PatchMapping("/{id}")
    @Operation(summary = "Phê duyệt hoặc từ chối hồ sơ", description = "Chỉ xử lý hồ sơ PENDING; sau timeout phải GET trạng thái trước khi thử lại")
    public ResponseEntity<BaseResponse<AdminPartnerRegistrationDetailResponse>> review(
            @PathVariable Long id, @Valid @RequestBody AdminPartnerReviewRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập bằng tài khoản quản trị");
        }
        return ResponseEntity.ok(new BaseResponse<>(true, "Đã xét duyệt hồ sơ đối tác",
                service.review(id, request, principal.getId())));
    }
}
