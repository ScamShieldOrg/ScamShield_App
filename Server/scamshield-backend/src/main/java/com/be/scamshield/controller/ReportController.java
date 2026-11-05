package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.CreateReportRequest;
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
    @Operation(summary = "Nộp báo cáo lừa đảo kèm tệp bằng chứng",
               description = "Bắt buộc gửi ít nhất một tệp JPG, PNG hoặc PDF không rỗng qua files. Tệp sẽ được băm SHA-256 và tự động tải lên Supabase Storage bucket.")
    public ResponseEntity<BaseResponse<ReportResponse>> createReportWithFiles(
            @Valid @RequestPart("request") CreateReportRequest request,
            @RequestPart("files") List<MultipartFile> files,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        ReportResponse response = reportService.createReport(request, files, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Gửi báo cáo lừa đảo thành công!", response));
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
