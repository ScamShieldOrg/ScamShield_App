package com.be.scamshield.controller;

import com.be.scamshield.dto.BaseResponse;
import com.be.scamshield.dto.request.DecideAbuseEscalationRequest;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationDetailResponse;
import com.be.scamshield.dto.admin.AdminAbuseEscalationFilterRequest;
import com.be.scamshield.dto.admin.AdminAbuseEscalationResponse;
import com.be.scamshield.service.IAdminAbuseEscalationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/admin/abuse-escalations")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMINISTRATOR')")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Admin Abuse Escalations", description = "Hàng đợi hồ sơ lạm dụng tài khoản dành cho quản trị viên")
public class AdminAbuseEscalationController {

    private final IAdminAbuseEscalationService adminAbuseEscalationService;

    @PutMapping("/{id}")
    @Operation(summary = "Quyết định xử lý hồ sơ lạm dụng tài khoản",
            description = "Chỉ xử lý hồ sơ PENDING một lần. DISMISS chuyển sang DISMISSED; FLAG, SUSPEND, BAN chuyển sang OPEN. "
                    + "SUSPEND/BAN đổi trạng thái tài khoản, không tự mở lại tài khoản bị hạn chế. "
                    + "Tạm khóa cần quản trị viên mở lại thủ công. Mọi quyết định và thay đổi tài khoản được lưu audit trong cùng giao dịch. "
                    + "Trả 409 nếu hồ sơ đã xử lý hoặc quyết định làm giảm mức hạn chế hiện tại.")
    public ResponseEntity<BaseResponse<AdminAbuseEscalationResponse>> decideEscalation(
            @PathVariable Long id, @Valid @RequestBody DecideAbuseEscalationRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Đã lưu quyết định xử lý hồ sơ lạm dụng",
                adminAbuseEscalationService.decideEscalation(id, request, currentUser)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Lấy chi tiết hồ sơ lạm dụng tài khoản",
            description = "Trả thông tin tài khoản hiện tại, các báo cáo liên quan và bằng chứng, kết quả kiểm duyệt gần nhất, "
                    + "thống kê report trong 24 giờ kết thúc tại thời điểm tạo hồ sơ và audit của đúng hồ sơ. "
                    + "Chỉ hỗ trợ PENDING, OPEN, DISMISSED. ID không hợp lệ trả 400; hồ sơ không tồn tại, RESOLVED cũ "
                    + "hoặc không gắn với tài khoản trả 404.")
    public ResponseEntity<BaseResponse<AdminAbuseEscalationDetailResponse>> getEscalationById(
            @Parameter(description = "ID số của hồ sơ lạm dụng", example = "41") @PathVariable Long id) {
        AdminAbuseEscalationDetailResponse result = adminAbuseEscalationService.getEscalationById(id);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy chi tiết hồ sơ lạm dụng thành công", result));
    }

    @GetMapping
    @Operation(summary = "Lấy hàng đợi hồ sơ lạm dụng tài khoản",
            description = "Mặc định lấy PENDING. Hỗ trợ lọc PENDING, OPEN, DISMISSED hoặc ALL; tìm kiếm tài khoản/mã hồ sơ; "
                    + "phân trang từ 0, tối đa 100 hồ sơ/trang. Mặc định createdAt DESC, id DESC. "
                    + "Có thể dùng sort=priority,desc (HIGH trước) hoặc priority,asc (LOW trước), dựa trên severity. "
                    + "Không lấy hồ sơ RESOLVED cũ và cờ không gắn với tài khoản.")
    public ResponseEntity<BaseResponse<PaginatedResponse<AdminAbuseEscalationResponse>>> getEscalations(
            @Valid @ModelAttribute @ParameterObject AdminAbuseEscalationFilterRequest filter) {
        PaginatedResponse<AdminAbuseEscalationResponse> result = adminAbuseEscalationService.getEscalations(filter);
        return ResponseEntity.ok(new BaseResponse<>(true, "Lấy hàng đợi hồ sơ lạm dụng thành công", result));
    }
}
