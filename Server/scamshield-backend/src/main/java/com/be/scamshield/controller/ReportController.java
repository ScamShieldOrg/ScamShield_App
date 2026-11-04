package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.dto.request.PresignedUrlRequest;
import com.be.scamshield.dto.response.PresignedUrlResponse;
import com.be.scamshield.dto.response.ReportResponse;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Tag(name = "Report Scam API", description = "API Tiếp nhận báo cáo hành vi lừa đảo")
public class ReportController {

    private final IReportService reportService;

    @PreAuthorize("isAuthenticated()")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Nộp báo cáo lừa đảo kèm file ảnh (Direct Multipart Upload)", 
               description = "Nộp thông tin báo cáo lừa đảo kèm trực tiếp danh sách tệp ảnh bằng chứng. Tệp sẽ được băm SHA-256 và tự động tải lên Supabase Storage bucket.")
    public ResponseEntity<BaseResponse<ReportResponse>> createReportWithFiles(
            @Valid @RequestPart("request") CreateReportRequest request,
            @RequestPart(value = "files", required = false) List<MultipartFile> files,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        ReportResponse response = reportService.createReport(request, files, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Gửi báo cáo lừa đảo thành công!", response));
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping(value = "/json", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Nộp báo cáo lừa đảo (Sử dụng URL ảnh đã tải lên Supabase Storage trước)", 
               description = "Nộp thông tin báo cáo với danh sách URL ảnh bằng chứng đã upload lên Supabase Storage bằng Presigned URL.")
    public ResponseEntity<BaseResponse<ReportResponse>> createReportWithUrls(
            @Valid @RequestBody CreateReportRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        ReportResponse response = reportService.createReport(request, null, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Gửi báo cáo lừa đảo thành công!", response));
    }

    @PreAuthorize("isAuthenticated()")
    @PostMapping("/presigned-url")
    @Operation(summary = "Xin Supabase Storage Presigned Upload URL", 
               description = "Khởi tạo URL tải ảnh trực tiếp từ trình duyệt Frontend lên Supabase Storage (Presigned PUT URL, có thời hạn 15 phút).")
    public ResponseEntity<BaseResponse<PresignedUrlResponse>> getPresignedUploadUrl(
            @Valid @RequestBody PresignedUrlRequest request) {
        
        PresignedUrlResponse response = reportService.generatePresignedUrl(request);
        return ResponseEntity.ok(new BaseResponse<>(true, "Tạo Supabase Storage Presigned Upload URL thành công", response));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết báo cáo lừa đảo", description = "Chỉ người gửi được xem nội dung và bằng chứng của báo cáo; báo cáo không thuộc người đăng nhập trả 404.")
    public ResponseEntity<BaseResponse<ReportResponse>> getReportById(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal currentUser) {
        ReportResponse response = reportService.getReportById(id, currentUser);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy thông tin báo cáo thành công", response));
    }

    @PreAuthorize("isAuthenticated()")
    @GetMapping("/my-reports")
    @Operation(summary = "Danh sách báo cáo của tôi", description = "Lấy lịch sử các báo cáo lừa đảo do cá nhân đã nộp.")
    public ResponseEntity<BaseResponse<List<ReportResponse>>> getMyReports(
            @AuthenticationPrincipal UserPrincipal currentUser) {
        
        List<ReportResponse> response = reportService.getMyReports(currentUser);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách báo cáo của tôi thành công", response));
    }
}
