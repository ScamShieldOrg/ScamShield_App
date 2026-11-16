package com.be.scamshield.dto.request;

import jakarta.validation.constraints.NotBlank;

public record PartnerRegistrationFinalizeRequest(
        @NotBlank(message = "Thiếu mã phiên đăng ký") String draftToken) { }
