package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerRegistrationResponse;
import com.be.scamshield.service.IPartnerRegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Encoding;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Tạo tài khoản và nộp hồ sơ đối tác", description = "Cần verificationToken từ /api/auth/verify-contacts sau khi xác thực điện thoại. Giấy phép kinh doanh phải là PDF; các tài liệu khác hỗ trợ PDF/JPG/PNG, tối đa 25MB/tệp. Đối soát tên doanh nghiệp và MST giữa form và XinVoice, kiểm tra status đủ điều kiện đang hoạt động; không đối soát người đại diện. OCR tạm tắt mặc định do chưa có API key: trả ocrEnabled=false và trạng thái tài liệu DISABLED, không chặn vì thiếu cấu hình OCR. Khi bật BUSINESS_LICENSE_OCR_ENABLED=true, bắt buộc tên/MST khớp cả PDF OCR. HTTP 422 nếu chưa đạt; HTTP 503 nếu dịch vụ đang dùng chưa sẵn sàng. Thành công lưu kết quả và tạo hồ sơ PENDING, tài khoản INACTIVE chờ duyệt.",
            requestBody = @RequestBody(content = @Content(mediaType = MediaType.MULTIPART_FORM_DATA_VALUE,
                    encoding = @Encoding(name = "request", contentType = MediaType.APPLICATION_JSON_VALUE))))
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
