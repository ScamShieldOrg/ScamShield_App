package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.response.UserScamCheckQuotaResponse;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IScamCheckService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me/scam-check-quota")
@RequiredArgsConstructor
@Tag(name = "User Scam Check Quota", description = "Hạn mức kiểm tra của tài khoản hiện tại")
public class UserScamCheckQuotaController {
    private final IScamCheckService scamChecks;

    @GetMapping
    @Operation(summary = "Xem hạn mức kiểm tra còn lại", description = "Dùng JWT của tài khoản hiện tại. Hạn mức theo hạng uy tín và đặt lại lúc 00:00 giờ Việt Nam.")
    public ResponseEntity<BaseResponse<UserScamCheckQuotaResponse>> getQuota(
            @AuthenticationPrincipal UserPrincipal user) {
        if (user == null) throw new UnauthorizedException("Vui lòng đăng nhập để xem hạn mức");
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy hạn mức kiểm tra thành công",
                scamChecks.getUserQuota(user.getId())));
    }
}
