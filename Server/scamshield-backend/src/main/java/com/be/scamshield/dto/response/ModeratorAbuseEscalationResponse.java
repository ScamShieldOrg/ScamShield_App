package com.be.scamshield.dto.response;

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
@Schema(description = "Hồ sơ lạm dụng tài khoản dành cho kiểm duyệt viên")
public class ModeratorAbuseEscalationResponse {
    private Long id;

    @Schema(description = "Mã hiển thị được sinh từ ID hồ sơ", example = "ESC-0041")
    private String escalationCode;

    private Long userId;

    @Schema(description = "Báo cáo liên quan theo liên kết hiện có; null nếu hồ sơ chưa liên kết báo cáo")
    private Long reportId;

    @Schema(description = "Tất cả ID báo cáo liên quan, bao gồm reportId của hồ sơ cũ")
    private List<Long> reportIds;

    @Schema(description = "ID Moderator tạo hồ sơ; null với dữ liệu cũ chưa ghi nhận người tạo")
    private Long createdByUserId;
    private String createdByName;

    private String flagType;
    private String severity;
    private String reason;
    private String evidence;
    private AbuseFlagStatus status;
    private LocalDateTime createdAt;
}
