package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.partner.PartnerSubmissionResponse;
import com.be.scamshield.dto.partner.SubmitPartnerAlertRequest;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerSubmissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/partner/submissions")
@RequiredArgsConstructor
@Tag(name = "Partner Scam Alert & Threat Intelligence", description = "API dành cho đối tác doanh nghiệp gửi cảnh báo lừa đảo và thông tin tình báo mối đe dọa kèm chứng cứ")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('BUSINESS_PARTNER')")
public class PartnerSubmissionController {

    private final IPartnerSubmissionService partnerSubmissionService;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Đối tác gửi cảnh báo lừa đảo hoặc tình báo đe dọa (kèm file bằng chứng)",
            description = "Cho phép đối tác doanh nghiệp gửi thông tin lừa đảo / giả mạo thương hiệu kèm tệp chứng cứ (hình ảnh, tài liệu). Hồ sơ tạo xong ở trạng thái PENDING.")
    public ResponseEntity<BaseResponse<PartnerSubmissionResponse>> submitWithFile(
            @RequestPart(value = "request", required = false) SubmitPartnerAlertRequest jsonRequest,
            @ModelAttribute SubmitPartnerAlertRequest formRequest,
            @RequestPart(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "file", required = false) MultipartFile paramFile,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        SubmitPartnerAlertRequest request = jsonRequest != null ? jsonRequest : formRequest;
        if (request == null) {
            request = new SubmitPartnerAlertRequest();
        }

        if (formRequest != null) {
            if (!StringUtils.hasText(request.getTitle()) && StringUtils.hasText(formRequest.getTitle())) {
                request.setTitle(formRequest.getTitle());
            }
            if (!StringUtils.hasText(request.getDescription()) && StringUtils.hasText(formRequest.getDescription())) {
                request.setDescription(formRequest.getDescription());
            }
            if (!StringUtils.hasText(request.getSubmissionType()) && StringUtils.hasText(formRequest.getSubmissionType())) {
                request.setSubmissionType(formRequest.getSubmissionType());
            }
            if (!StringUtils.hasText(request.getIndicatorType()) && StringUtils.hasText(formRequest.getIndicatorType())) {
                request.setIndicatorType(formRequest.getIndicatorType());
            }
            if (!StringUtils.hasText(request.getIndicatorValue()) && StringUtils.hasText(formRequest.getIndicatorValue())) {
                request.setIndicatorValue(formRequest.getIndicatorValue());
            }
            if (!StringUtils.hasText(request.getCategoryCode()) && StringUtils.hasText(formRequest.getCategoryCode())) {
                request.setCategoryCode(formRequest.getCategoryCode());
            }
        }

        if (!StringUtils.hasText(request.getTitle())) {
            throw new com.be.scamshield.exception.BadRequestException("Tiêu đề cảnh báo không được để trống");
        }
        if (!StringUtils.hasText(request.getDescription())) {
            throw new com.be.scamshield.exception.BadRequestException("Mô tả chi tiết không được để trống");
        }

        MultipartFile actualFile = file != null ? file : (paramFile != null ? paramFile : (formRequest != null ? formRequest.getFile() : request.getFile()));

        PartnerSubmissionResponse response = partnerSubmissionService.submitAlertOrIntel(request, actualFile, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Gửi cảnh báo / tình báo thành công, hồ sơ đang chờ xét duyệt", response));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Đối tác gửi cảnh báo lừa đảo hoặc tình báo đe dọa (JSON body)",
            description = "Dùng khi gửi thông tin cảnh báo hoặc tình báo mà không cần đính kèm tệp trực tiếp.")
    public ResponseEntity<BaseResponse<PartnerSubmissionResponse>> submitJson(
            @Valid @RequestBody SubmitPartnerAlertRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        PartnerSubmissionResponse response = partnerSubmissionService.submitAlertOrIntel(request, null, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Gửi cảnh báo / tình báo thành công, hồ sơ đang chờ xét duyệt", response));
    }

    @GetMapping
    @Operation(summary = "Lấy danh sách các hồ sơ cảnh báo / tình báo của đối tác hiện tại",
            description = "Trả về danh sách có phân trang và lọc theo trạng thái (ALL, PENDING, VERIFIED, REJECTED).")
    public ResponseEntity<BaseResponse<PaginatedResponse<PartnerSubmissionResponse>>> getMySubmissions(
            @RequestParam(required = false, defaultValue = "ALL") String status,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "10") int size,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        PaginatedResponse<PartnerSubmissionResponse> response = partnerSubmissionService.getMySubmissions(status, page, size, currentUser);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách hồ sơ gửi thành công", response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết hồ sơ gửi của đối tác theo ID")
    public ResponseEntity<BaseResponse<PartnerSubmissionResponse>> getMySubmissionDetail(
            @Parameter(description = "ID hồ sơ") @PathVariable Long id,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        PartnerSubmissionResponse response = partnerSubmissionService.getMySubmissionDetail(id, currentUser);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết hồ sơ thành công", response));
    }

    @GetMapping("/{id}/evidence")
    @Operation(summary = "Tải tệp bằng chứng của hồ sơ")
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
}
