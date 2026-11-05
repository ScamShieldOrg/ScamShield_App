package com.be.scamshield.dto.partner;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin phản hồi hồ sơ cảnh báo / tình báo đối tác")
public class PartnerSubmissionResponse {

    @Schema(description = "ID hồ sơ", example = "1")
    private Long id;

    @Schema(description = "Mã hồ sơ chuẩn hóa", example = "PAL-2026-0001")
    private String submissionCode;

    @Schema(description = "Loại hồ sơ", example = "THREAT_INTEL")
    private String submissionType;

    @Schema(description = "Tiêu đề", example = "Phát hiện tên miền giả mạo Shopee")
    private String title;

    @Schema(description = "Mô tả chi tiết")
    private String description;

    @Schema(description = "Loại chỉ số", example = "WEBSITE")
    private String indicatorType;

    @Schema(description = "Giá trị chỉ số hiển thị", example = "shopee-tuyendung-ctv.xyz")
    private String indicatorValue;

    @Schema(description = "Giá trị chỉ số đã chuẩn hóa", example = "shopee-tuyendung-ctv.xyz")
    private String normalizedValue;

    @Schema(description = "ID chỉ số trong hệ thống (Candidate hoặc Existing Indicator)")
    private Long indicatorId;

    @Schema(description = "Trạng thái xử lý chỉ số: CANDIDATE_CREATED, EXISTING_UPDATED, NONE", example = "CANDIDATE_CREATED")
    private String indicatorAction;

    @Schema(description = "Mã danh mục", example = "GIA_DANH_TMDT")
    private String categoryCode;

    @Schema(description = "Tên danh mục", example = "Giả mạo sàn TMĐT")
    private String categoryName;

    @Schema(description = "Trạng thái hồ sơ: PENDING, VERIFIED, REJECTED", example = "PENDING")
    private String status;

    @Schema(description = "Đường dẫn tệp bằng chứng")
    private String evidenceUrl;

    @Schema(description = "Tên tệp bằng chứng")
    private String evidenceFileName;

    @Schema(description = "Loại tệp bằng chứng")
    private String evidenceContentType;

    @Schema(description = "Kích thước tệp bằng chứng (bytes)")
    private Long evidenceFileSize;

    @Schema(description = "ID đối tác gửi")
    private Long partnerId;

    @Schema(description = "Tên pháp lý đối tác")
    private String partnerLegalName;

    @Schema(description = "Tên thương hiệu đối tác", example = "Shopee")
    private String partnerBrandName;

    @Schema(description = "Người kiểm duyệt")
    private String reviewedByName;

    @Schema(description = "Thời gian kiểm duyệt")
    private LocalDateTime reviewedAt;

    @Schema(description = "Ghi chú hoặc lý do kiểm duyệt")
    private String reviewNotes;

    @Schema(description = "ID chỉ số đã xác nhận vào Blacklist (nếu được phê duyệt)")
    private Long confirmedIndicatorId;

    @Schema(description = "Chỉ số đã được xác nhận (CONFIRMED) vào danh sách cảnh báo hay chưa", example = "true")
    private Boolean isConfirmed;

    @Schema(description = "Thời gian tạo")
    private LocalDateTime createdAt;

    @Schema(description = "Thời gian cập nhật")
    private LocalDateTime updatedAt;
}

