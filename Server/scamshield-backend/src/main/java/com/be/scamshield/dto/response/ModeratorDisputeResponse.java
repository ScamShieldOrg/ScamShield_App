package com.be.scamshield.dto.response;

import com.be.scamshield.constant.DisputeStatus;
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
@Schema(description = "Thông tin chi tiết một ca khiếu nại trong hàng chờ kiểm duyệt")
public class ModeratorDisputeResponse {

    @Schema(description = "Mã kháng nghị hiển thị (ví dụ: AP-2024-0041)", example = "AP-2024-0041")
    private String id;

    @Schema(description = "ID gốc trong CSDL", example = "41")
    private Long rawId;

    @Schema(description = "Mã hồ sơ báo cáo gốc liên quan (ví dụ: CS-2024-1820)", example = "CS-2024-1820")
    private String originalReportId;

    @Schema(description = "Chỉ số/đối tượng bị báo cáo (SĐT, tên miền, STK...)", example = "0383 456 789")
    private String targetIdentifier;

    @Schema(description = "Loại đối tượng (PHONE, WEBSITE, BANK_ACCOUNT...)", example = "PHONE")
    private String targetType;

    @Schema(description = "Tên danh mục thủ đoạn", example = "Lừa đảo việc làm lương cao")
    private String category;

    @Schema(description = "Tên người nộp kháng nghị", example = "lehoangtung_biz")
    private String disputedBy;

    @Schema(description = "Thời điểm gửi kháng nghị định dạng hiển thị", example = "14/01 16:45")
    private String disputedAt;

    @Schema(description = "Thời điểm tạo hồ sơ trong hệ thống")
    private LocalDateTime createdAt;

    @Schema(description = "Trạng thái hiển thị theo giao diện (Đang xét, Chấp nhận, Từ chối)", example = "Đang xét")
    private String status;

    @Schema(description = "Mã trạng thái chuẩn hóa enum (PENDING, IN_REVIEW, APPROVED, REJECTED...)", example = "PENDING")
    private DisputeStatus statusCode;

    @Schema(description = "Quyết định của báo cáo gốc (Approved hoặc Rejected)", example = "Approved")
    private String originalDecision;

    @Schema(description = "Lý do nộp kháng nghị", example = "Đây là số điện thoại của công ty tuyển dụng hợp pháp...")
    private String disputeReason;

    @Schema(description = "Mối quan hệ pháp lý với đối tượng bị báo cáo", example = "BUSINESS_OWNER")
    private String legalRelationship;

    @Schema(description = "Thông tin liên hệ của người nộp kháng nghị", example = "contact@company.com")
    private String submitterContact;

    @Schema(description = "Danh sách bằng chứng phản bác đính kèm")
    private List<ModeratorEvidenceResponse> evidences;

    @Schema(description = "Số lượng tệp bằng chứng", example = "3")
    private int evidenceCount;

    @Schema(description = "Người được phân công xem xét", example = "VCB Security Sentinel")
    private String assignedTo;

    @Schema(description = "Người đã đưa ra phán quyết", example = "VCB Security Sentinel")
    private String resolvedBy;

    @Schema(description = "Thời điểm đưa ra phán quyết")
    private LocalDateTime resolvedAt;

    @Schema(description = "Lý do phán quyết của kiểm duyệt viên", example = "Bằng chứng giấy phép kinh doanh hợp lệ...")
    private String resolutionReason;
}
