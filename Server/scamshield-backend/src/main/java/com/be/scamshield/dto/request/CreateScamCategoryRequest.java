package com.be.scamshield.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateScamCategoryRequest {
    @NotBlank(message = "Tên phân loại không được để trống")
    @Size(max = 255, message = "Tên phân loại không được vượt quá 255 ký tự")
    private String name;

    @NotBlank(message = "Mô tả không được để trống")
    @Size(max = 255, message = "Mô tả không được vượt quá 255 ký tự")
    private String description;
}
