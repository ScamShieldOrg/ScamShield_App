package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.partner.PartnerProfileResponse;
import com.be.scamshield.dto.partner.UpdatePartnerProfileRequest;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IPartnerProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/partner/profile")
@RequiredArgsConstructor
@Tag(name = "Hồ sơ đối tác", description = "Xem hồ sơ và cập nhật người đại diện của đối tác đang đăng nhập")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('BUSINESS_PARTNER')")
public class PartnerProfileController {
    private final IPartnerProfileService profiles;

    @GetMapping
    @Operation(summary = "Xem hồ sơ đối tác của tài khoản đang đăng nhập")
    public ResponseEntity<BaseResponse<PartnerProfileResponse>> getOwnProfile(
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new BaseResponse<>(true, "Đã tải hồ sơ đối tác", profiles.getOwnProfile(principal)));
    }


    @PatchMapping
    @Operation(summary = "Cập nhật người đại diện hoặc email liên hệ")
    public ResponseEntity<BaseResponse<PartnerProfileResponse>> updateOwnProfile(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody UpdatePartnerProfileRequest request) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(new BaseResponse<>(true, "Đã cập nhật hồ sơ đối tác", profiles.updateOwnProfile(principal, request)));
    }
}
