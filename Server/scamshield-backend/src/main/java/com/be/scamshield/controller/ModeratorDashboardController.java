package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.response.ModeratorDashboardResponse;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.serviceImpl.ModeratorDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/moderator/dashboard")
@PreAuthorize("hasRole('MODERATOR')")
@RequiredArgsConstructor
@Tag(name = "Moderator Dashboard")
public class ModeratorDashboardController {
    private final ModeratorDashboardService dashboard;

    @GetMapping
    @Operation(summary = "Thống kê quyết định của kiểm duyệt viên đang đăng nhập")
    public BaseResponse<ModeratorDashboardResponse> getOverview(@AuthenticationPrincipal UserPrincipal moderator) {
        return new BaseResponse<>(true, "Lấy tổng quan kiểm duyệt thành công", dashboard.getOverview(moderator));
    }
}
