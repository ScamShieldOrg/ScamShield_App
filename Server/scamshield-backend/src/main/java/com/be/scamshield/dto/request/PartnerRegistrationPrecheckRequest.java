package com.be.scamshield.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record PartnerRegistrationPrecheckRequest(
        @NotNull(message = "Thiếu thông tin đăng ký") @Valid RegisterPartnerRequest registration,
        @NotEmpty(message = "Cần khai báo tài liệu đăng ký")
        @Size(max = 10, message = "Tối đa 10 tài liệu")
        List<@Valid PartnerDocumentUploadRequest> documents) { }
