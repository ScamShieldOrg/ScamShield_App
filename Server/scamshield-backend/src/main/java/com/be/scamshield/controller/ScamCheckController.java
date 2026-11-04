package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.dto.response.ScamCheckResponse;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IScamCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/scam-checks")
@Tag(name = "Scam Checks", description = "Kiểm tra lừa đảo chung cho khách vãng lai và người dùng đăng nhập")
@RequiredArgsConstructor
public class ScamCheckController {
    private final IScamCheckService scamChecks;

    @PostMapping
    @Operation(summary = "Kiểm tra nội dung hoặc chỉ số khả nghi", description = "Dùng JWT hoặc X-Guest-Session. "
            + "Core kiểm tra danh sách xác minh; nội dung còn lại được gửi sang dịch vụ AI sau khi che thông tin cá nhân. Chưa hỗ trợ tải ảnh OCR.")
    public ResponseEntity<BaseResponse<ScamCheckResponse>> check(
            @Valid @RequestBody ScamCheckRequest request,
            @AuthenticationPrincipal UserPrincipal user,
            @Parameter(description = "Token từ POST /api/guest/sessions; bắt buộc khi không đăng nhập")
            @RequestHeader(value = "X-Guest-Session", required = false) String guestToken) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Kiểm tra hoàn tất",
                scamChecks.check(request, user == null ? null : user.getId(), guestToken)));
    }

    @GetMapping("/{checkId}")
    @Operation(summary = "Xem lại kết quả kiểm tra", description = "Chỉ chủ sở hữu JWT hoặc phiên khách gốc được xem. "
            + "Kết quả không thuộc sở hữu, đã xóa hoặc hết thời gian lưu trả 404.")
    public ResponseEntity<BaseResponse<ScamCheckResponse>> getResult(
            @PathVariable Long checkId,
            @AuthenticationPrincipal UserPrincipal user,
            @RequestHeader(value = "X-Guest-Session", required = false) String guestToken) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy kết quả kiểm tra thành công",
                scamChecks.getResult(checkId, user == null ? null : user.getId(), guestToken)));
    }
}
