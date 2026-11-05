package com.be.scamshield.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateOwnReportRequest {
    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 2000, message = "Mô tả tối đa 2.000 ký tự")
    private String description;
    @Size(max = 2000, message = "Nội dung tin nhắn tối đa 2.000 ký tự")
    private String reportedMessage;
    @Positive(message = "ID danh mục phải là số dương")
    private Long categoryId;
    @Pattern(regexp = "[0-9]{2}|^$", message = "Mã khu vực phải gồm 2 chữ số")
    private String regionCode;
    // null preserves current evidence; a supplied list replaces it, including [] to remove all.
    @Size(max = 20, message = "Tối đa 20 bằng chứng")
    private List<@NotNull(message = "Bằng chứng không được null") @Valid EvidenceItemDto> evidences;
}
