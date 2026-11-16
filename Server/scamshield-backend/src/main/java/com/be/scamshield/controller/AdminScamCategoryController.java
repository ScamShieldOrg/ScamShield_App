package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.admin.AdminScamCategoryResponse;
import com.be.scamshield.dto.request.CreateScamCategoryRequest;
import com.be.scamshield.dto.request.UpdateScamCategoryRequest;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAdminScamCategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/scam-categories")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRATOR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin scam categories", description = "Quản lý phân loại lừa đảo")
public class AdminScamCategoryController {
    private final IAdminScamCategoryService service;

    @GetMapping
    @Operation(summary = "Danh sách phân loại lừa đảo, gồm cả phân loại đã tắt")
    public ResponseEntity<BaseResponse<List<AdminScamCategoryResponse>>> list() {
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách phân loại thành công", service.list()));
    }

    @PostMapping
    @Operation(summary = "Thêm phân loại lừa đảo")
    public ResponseEntity<BaseResponse<AdminScamCategoryResponse>> create(
            @Valid @RequestBody CreateScamCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Thêm phân loại thành công",
                        service.create(request, actorId(principal))));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Sửa tên, mô tả hoặc trạng thái phân loại lừa đảo")
    public ResponseEntity<BaseResponse<AdminScamCategoryResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateScamCategoryRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Cập nhật phân loại thành công",
                service.update(id, request, actorId(principal))));
    }

    private Long actorId(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new UnauthorizedException("Vui lòng đăng nhập bằng tài khoản quản trị");
        }
        return principal.getId();
    }
}
