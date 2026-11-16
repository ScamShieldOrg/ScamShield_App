package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.dto.request.PartnerRegistrationPrecheckRequest;
import com.be.scamshield.dto.request.PartnerRegistrationFinalizeRequest;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import com.be.scamshield.service.IPartnerRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/partners/registrations")
@RequiredArgsConstructor
@Tag(name = "Partner registration", description = "Nộp hồ sơ đăng ký đối tác doanh nghiệp")
public class PartnerRegistrationController {
    private final IPartnerRegistrationService registrationService;

    @GetMapping("/{draftToken}/status")
    public ResponseEntity<BaseResponse<com.be.scamshield.dto.response.PartnerRegistrationStatusResponse>> status(
            @PathVariable String draftToken) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Trạng thái đăng ký", registrationService.status(draftToken)));
    }

    @PostMapping("/{draftToken}/refresh")
    public ResponseEntity<BaseResponse<java.time.LocalDateTime>> refresh(@PathVariable String draftToken) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Đã gia hạn phiên đăng ký", registrationService.refreshDraft(draftToken)));
    }

    @PostMapping("/{draftToken}/uploads/{documentIndex}/renew")
    public ResponseEntity<BaseResponse<PartnerRegistrationPrecheckResponse.Upload>> renewUpload(
            @PathVariable String draftToken, @PathVariable int documentIndex) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Đã cấp lại URL tải tệp",
                registrationService.renewUpload(draftToken, documentIndex)));
    }

    @PostMapping(value = "/precheck", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Đối soát doanh nghiệp và cấp URL tải tài liệu",
            description = "Ghi nhận kết quả XInvoice để quản trị viên đối soát và cấp presigned URL cho bucket partner-documents")
    public ResponseEntity<BaseResponse<PartnerRegistrationPrecheckResponse>> precheck(
            @Valid @RequestBody PartnerRegistrationPrecheckRequest request) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Thông tin doanh nghiệp hợp lệ; có thể tải tài liệu",
                registrationService.precheck(request)));
    }

    @PostMapping(value = "/finalize", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "Hoàn tất đăng ký đối tác sau khi tải tài liệu",
            description = "Xác minh metadata và chữ ký tệp, tạo hồ sơ chờ duyệt; OCR chạy sau trong nền nếu bật")
    public ResponseEntity<BaseResponse<PartnerRegistrationResponse>> finalizeRegistration(
            @Valid @RequestBody PartnerRegistrationFinalizeRequest request) {
        PartnerRegistrationResponse response = registrationService.finalizeRegistration(request.draftToken());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Hồ sơ đối tác đã được gửi và đang chờ xét duyệt", response));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo tài khoản và nộp hồ sơ đối tác", description = "API multipart cũ; luồng mới dùng precheck và finalize để tải file trực tiếp lên Storage.")
    public ResponseEntity<BaseResponse<PartnerRegistrationResponse>> register(
            @Valid @RequestPart("request") RegisterPartnerRequest request,
            @RequestPart(value = "businessLicenseFiles", required = false) List<MultipartFile> businessLicenseFiles,
            @RequestPart(value = "ownershipProofFiles", required = false) List<MultipartFile> ownershipProofFiles,
            @RequestPart(value = "authorizationFiles", required = false) List<MultipartFile> authorizationFiles) {
        PartnerRegistrationResponse response = registrationService.register(
                request, businessLicenseFiles, ownershipProofFiles, authorizationFiles);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Hồ sơ đối tác đã được gửi và đang chờ xét duyệt", response));
    }
}
