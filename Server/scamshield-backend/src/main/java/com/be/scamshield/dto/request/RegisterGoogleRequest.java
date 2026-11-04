package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterGoogleRequest {

    @Schema(description = "Token ID (JWT) nhận được từ Google Sign-In ở Frontend", example = "eyJhbGciOiJSUzI1NiIs...")
    @NotBlank(message = "Google ID Token không được để trống")
    private String idToken;

    @Schema(description = "Số điện thoại người dùng (bắt buộc vì DB yêu cầu)", example = "0912345678")
    @NotBlank(message = "Số điện thoại không được để trống")
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải bắt đầu bằng số 0 và gồm đúng 10 chữ số")
    private String phoneNumber;

    @Schema(description = "Mã xác nhận 43 ký tự từ /api/auth/verify-contacts sau khi xác thực OTP điện thoại", example = "E_e1Qz9wM-e65_qX38K-11_29d_o012345678901234")
    @Pattern(regexp = "^[A-Za-z0-9_-]{43}$", message = "Mã xác nhận điện thoại không hợp lệ")
    private String verificationToken;

    @Schema(description = "Mã OTP SMS gồm 6 chữ số (dùng nếu gửi trực tiếp OTP thay vì verificationToken)", example = "123456")
    @Pattern(regexp = "^[0-9]{6}$", message = "Mã OTP SMS phải gồm 6 chữ số")
    private String phoneOtp;

    @AssertTrue(message = "Bạn phải đồng ý với điều khoản sử dụng")
    private boolean agreeTerms;

    private boolean receiveAlerts;
}
