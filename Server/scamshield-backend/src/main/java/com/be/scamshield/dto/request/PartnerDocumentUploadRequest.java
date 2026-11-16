package com.be.scamshield.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record PartnerDocumentUploadRequest(
        @NotBlank(message = "Loại tài liệu không được để trống")
        String documentType,
        @NotBlank(message = "Tên file không được để trống")
        @Size(max = 255, message = "Tên file tối đa 255 ký tự")
        String fileName,
        @NotBlank(message = "MIME type không được để trống")
        String contentType,
        @Positive(message = "Kích thước file phải lớn hơn 0")
        long fileSize) { }
