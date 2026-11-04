package com.be.scamshield.dto.admin;

import com.be.scamshield.constant.AbuseFlagStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Hồ sơ lạm dụng và thông tin tài khoản để quản trị viên xét duyệt")
public class AdminAbuseEscalationResponse {
    private Long id;
    private String escalationCode;
    private Long userId;
    private String userCode;
    private String fullName;
    private String email;

    @Schema(description = "Trạng thái hiện tại của tài khoản, độc lập với trạng thái hồ sơ")
    private String userStatus;

    @Schema(description = "ID người tạo; có thể null với hồ sơ cũ")
    private Long createdByUserId;
    private String createdByName;
    private String flagType;
    private String severity;
    private String reason;
    private String evidence;
    private AbuseFlagStatus status;

    @Schema(description = "Các ID báo cáo liên quan, bao gồm liên kết report_id của hồ sơ cũ")
    private List<Long> reportIds;
    private LocalDateTime createdAt;
}
