package com.be.scamshield.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ScamCheckRequest {
    @NotBlank(message = "Loại nội dung không được để trống")
    @Pattern(regexp = "MESSAGE|URL|DOMAIN|PHONE|BANK_ACCOUNT|CALL_TRANSCRIPT",
            message = "Loại nội dung phải là MESSAGE, URL, DOMAIN, PHONE, BANK_ACCOUNT hoặc CALL_TRANSCRIPT")
    private String inputType;

    @NotBlank(message = "Nội dung kiểm tra không được để trống")
    @Size(max = 10000, message = "Nội dung kiểm tra không được vượt quá 10.000 ký tự")
    private String content;
}
