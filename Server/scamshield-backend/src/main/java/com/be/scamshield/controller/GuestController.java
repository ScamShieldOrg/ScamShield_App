package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.CreateGuestSessionRequest;
import com.be.scamshield.dto.response.GuestQuotaResponse;
import com.be.scamshield.dto.response.GuestSessionResponse;
import com.be.scamshield.service.IGuestSessionService;
import com.be.scamshield.service.IQuotaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/guest")
@RequiredArgsConstructor
@Tag(name = "Guest", description = "Quản lý phiên và hạn mức kiểm tra AI cho khách vãng lai")
public class GuestController {

    private final IGuestSessionService guestSessionService;
    private final IQuotaService quotaService;

    @PostMapping("/sessions")
    @Operation(summary = "Khởi tạo hoặc khôi phục phiên khách vãng lai",
            description = "Tạo phiên làm việc mới cho khách vãng lai hoặc khôi phục phiên hiện tại. Idempotent theo thiết bị và session token.")
    public ResponseEntity<BaseResponse<GuestSessionResponse>> createSession(
            @Valid @RequestBody(required = false) CreateGuestSessionRequest request,
            HttpServletRequest httpRequest) {
        GuestSessionResponse response = guestSessionService.createOrGetSession(request, httpRequest);
        return ResponseEntity.ok(new BaseResponse<>(true, "Khởi tạo phiên khách vãng lai thành công", response));
    }

    @GetMapping("/quota")
    @Operation(summary = "Xem hạn mức kiểm tra AI trong ngày",
            description = "Trả về hạn mức kiểm tra AI trong ngày cho khách vãng lai bao gồm: số lượt tối đa, số lượt đã dùng, số lượt còn lại và thời gian đặt lại (nửa đêm hôm nay theo giờ Việt Nam).")
    public ResponseEntity<BaseResponse<GuestQuotaResponse>> getQuota(
            @Parameter(description = "Token phiên khách vãng lai gửi qua header (tùy chọn)")
            @RequestHeader(value = "X-Guest-Session", required = false) String headerToken,
            @Parameter(description = "Token phiên khách vãng lai gửi qua query param (tùy chọn)")
            @RequestParam(value = "sessionToken", required = false) String paramToken,
            HttpServletRequest httpRequest) {
        String token = (headerToken != null && !headerToken.isBlank())
                ? headerToken.trim()
                : (paramToken != null && !paramToken.isBlank() ? paramToken.trim() : null);

        GuestQuotaResponse response = quotaService.getGuestQuota(token, httpRequest);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy thông tin hạn mức kiểm tra AI thành công", response));
    }
}
