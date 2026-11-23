package com.be.scamshield.dto.partner;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import java.util.Locale;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UpdatePartnerProfileRequest(
        @Size(min = 1, max = 255, message = "Thông tin người đại diện phải có từ 1 đến 255 ký tự")
        String representativeNameAndTitle,
        @Email(message = "Email không đúng định dạng")
        @Size(min = 1, max = 254, message = "Email phải có từ 1 đến 254 ký tự")
        String corporateEmail,
        @Size(max = 256, message = "Mật khẩu hiện tại không hợp lệ")
        String currentPassword
) {
    public UpdatePartnerProfileRequest {
        if (representativeNameAndTitle != null) {
            representativeNameAndTitle = representativeNameAndTitle.strip();
        }
        if (corporateEmail != null) {
            corporateEmail = corporateEmail.strip().toLowerCase(Locale.ROOT);
        }
    }

    @Override
    public String toString() {
        return "UpdatePartnerProfileRequest";
    }
}
