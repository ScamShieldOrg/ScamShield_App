package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.admin.*;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRATOR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin User Management API", description = "Dành riêng cho Quản trị viên (ADMINISTRATOR): quản lý danh sách tài khoản người dùng, đổi vai trò, khóa/mở tài khoản và xử lý cờ lạm dụng")
public class AdminUserController {

    private final IAdminUserService adminUserService;

    @GetMapping
    @Operation(
            summary = "Lấy danh sách người dùng (Admin Dashboard)",
            description = "Trả về danh sách tài khoản người dùng hỗ trợ tìm kiếm theo tên, email, SĐT, mã tài khoản (U-00041); " +
                    "lọc theo vai trò (role) và trạng thái (status); phân trang và thống kê số tài khoản bị gắn cờ lạm dụng."
    )
    public ResponseEntity<BaseResponse<AdminUserListResponse>> getUsers(
            @Parameter(description = "Từ khóa tìm kiếm (tên, email, số điện thoại, ID)")
            @RequestParam(required = false) String search,
            @Parameter(description = "Lọc theo vai trò (REGISTERED_USER, MODERATOR, BUSINESS_PARTNER, ADMINISTRATOR)")
            @RequestParam(required = false) String role,
            @Parameter(description = "Lọc theo trạng thái (ACTIVE, INACTIVE, SUSPENDED, BANNED)")
            @RequestParam(required = false) String status,
            @Parameter(description = "Số trang (bắt đầu từ 1)")
            @RequestParam(defaultValue = "1") int page,
            @Parameter(description = "Số lượng bản ghi mỗi trang")
            @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Trường sắp xếp (createdAt, fullName, email, reportCount)")
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @Parameter(description = "Hướng sắp xếp (asc hoặc desc)")
            @RequestParam(defaultValue = "desc") String sortDir
    ) {
        AdminUserListResponse response = adminUserService.getUsers(
                search, role, status, page, size, sortBy, sortDir
        );
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách tài khoản thành công", response));
    }

    @GetMapping("/roles")
    @Operation(
            summary = "Lấy danh sách vai trò khả dụng trong hệ thống",
            description = "Trả về danh sách các vai trò (Người dùng, Kiểm duyệt viên, Đối tác, Quản trị viên) để hiển thị trong modal Đổi vai trò."
    )
    public ResponseEntity<BaseResponse<List<AdminRoleOptionResponse>>> getAvailableRoles() {
        List<AdminRoleOptionResponse> roles = adminUserService.getAvailableRoles();
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy danh sách vai trò khả dụng thành công", roles));
    }

    @GetMapping("/{id}")
    @Operation(
            summary = "Xem chi tiết tài khoản người dùng",
            description = "Trả về thông tin chi tiết một tài khoản bao gồm lịch sử gắn cờ lạm dụng, điểm uy tín, rank, ngày tạo và ngày đăng nhập gần nhất."
    )
    public ResponseEntity<BaseResponse<AdminUserDetailResponse>> getUserDetail(
            @Parameter(description = "ID người dùng") @PathVariable Long id
    ) {
        AdminUserDetailResponse response = adminUserService.getUserDetail(id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết tài khoản thành công", response));
    }

    @PutMapping("/{id}/role")
    @Operation(
            summary = "Cập nhật vai trò người dùng (Nút Đổi vai trò)",
            description = "Thay đổi vai trò của người dùng (Ví dụ: từ Người dùng thành Kiểm duyệt viên hoặc Đối tác). " +
                    "Hệ thống sẽ ghi log nhật ký kiểm toán (Audit Log) và ngăn chặn Admin tự hạ cấp quyền của chính mình."
    )
    public ResponseEntity<BaseResponse<AdminUserItemResponse>> updateUserRole(
            @Parameter(description = "ID người dùng cần đổi vai trò") @PathVariable Long id,
            @Valid @RequestBody AdminUpdateRoleRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String adminUsername = currentUser != null ? currentUser.getUsername() : "SYSTEM_ADMIN";
        AdminUserItemResponse updatedUser = adminUserService.updateUserRole(id, request, adminUsername);
        return ResponseEntity.ok(new BaseResponse<>(true, "Cập nhật vai trò người dùng thành công", updatedUser));
    }

    @PutMapping("/{id}/status")
    @Operation(
            summary = "Cập nhật trạng thái tài khoản (Khóa / Mở khóa / Kích hoạt)",
            description = "Thay đổi trạng thái tài khoản: ACTIVE, INACTIVE, SUSPENDED, BANNED. Ghi log kiểm toán kèm lý do thực hiện."
    )
    public ResponseEntity<BaseResponse<AdminUserItemResponse>> updateUserStatus(
            @Parameter(description = "ID người dùng") @PathVariable Long id,
            @Valid @RequestBody AdminUpdateStatusRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String adminUsername = currentUser != null ? currentUser.getUsername() : "SYSTEM_ADMIN";
        AdminUserItemResponse updatedUser = adminUserService.updateUserStatus(id, request, adminUsername);
        return ResponseEntity.ok(new BaseResponse<>(true, "Cập nhật trạng thái tài khoản thành công", updatedUser));
    }

    @PostMapping("/{id}/flags")
    @Operation(
            summary = "Gắn cờ cảnh báo lạm dụng cho tài khoản",
            description = "Đánh dấu tài khoản có dấu hiệu bất thường (Spam báo cáo, lạm dụng hệ thống, v.v.) và kích hoạt cờ cảnh báo trên Dashboard."
    )
    public ResponseEntity<BaseResponse<AdminAbuseFlagResponse>> createAbuseFlag(
            @Parameter(description = "ID người dùng") @PathVariable Long id,
            @Valid @RequestBody AdminCreateFlagRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String adminUsername = currentUser != null ? currentUser.getUsername() : "SYSTEM_ADMIN";
        AdminAbuseFlagResponse flag = adminUserService.createAbuseFlag(id, request, adminUsername);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new BaseResponse<>(true, "Gắn cờ cảnh báo lạm dụng tài khoản thành công", flag));
    }

    @PatchMapping("/{id}/flags/{flagId}/resolve")
    @Operation(
            summary = "Giải tỏa cờ lạm dụng cho tài khoản",
            description = "Đổi trạng thái cờ lạm dụng từ OPEN sang RESOLVED khi tài khoản đã được xác minh hoặc kiểm duyệt viên giải quyết khiếu nại."
    )
    public ResponseEntity<BaseResponse<AdminAbuseFlagResponse>> resolveAbuseFlag(
            @Parameter(description = "ID người dùng") @PathVariable Long id,
            @Parameter(description = "ID cờ lạm dụng cần giải tỏa") @PathVariable Long flagId,
            @AuthenticationPrincipal UserPrincipal currentUser
    ) {
        String adminUsername = currentUser != null ? currentUser.getUsername() : "SYSTEM_ADMIN";
        AdminAbuseFlagResponse flag = adminUserService.resolveAbuseFlag(id, flagId, adminUsername);
        return ResponseEntity.ok(new BaseResponse<>(true, "Giải tỏa cờ lạm dụng thành công", flag));
    }
}
