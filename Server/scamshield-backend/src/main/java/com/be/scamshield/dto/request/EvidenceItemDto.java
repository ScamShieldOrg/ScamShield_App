package com.be.scamshield.dto.request;

import jakarta.validation.constraints.NotBlank;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvidenceItemDto {

    @NotBlank(message = "URL hình ảnh/bằng chứng không được để trống")
    private String fileUrl;

    private String fileHash;

    @Schema(description = "JPG, PNG hoặc PDF; nếu bỏ trống, suy ra từ tên tệp hoặc đường dẫn URL. JPEG được lưu thành JPG")
    private String evidenceType;

    private String fileName;
}
