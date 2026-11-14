package com.be.scamshield.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateScamCategoryRequest {
    @NotBlank(message = "Tên phân loại không được để trống")
    @Size(max = 255, message = "Tên phân loại không được vượt quá 255 ký tự")
    private String name;

    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
    private String description;

    @NotNull(message = "Trạng thái phân loại là bắt buộc")
    private Boolean isActive;

    @NotNull(message = "Phiên bản phân loại là bắt buộc")
    @Min(value = 1, message = "Phiên bản phân loại không hợp lệ")
    private Integer version;
}
