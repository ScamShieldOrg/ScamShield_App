package com.be.scamshield.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu đăng nhập bằng tài khoản Google")
public class LoginGoogleRequest {

    @Schema(description = "Google ID Token (JWT) nhận được từ Google Sign-In ở Frontend", example = "eyJhbGciOiJSUzI1NiIs...")
    @NotBlank(message = "Google ID Token không được để trống")
    private String idToken;
}
