package com.be.scamshield.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PartnerPasswordSetupRequest(
        @NotBlank String token,
        @NotBlank @Size(min = 6, max = 100) String newPassword) { }
