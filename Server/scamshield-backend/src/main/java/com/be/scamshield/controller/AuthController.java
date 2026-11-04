package com.be.scamshield.controller;

import com.be.scamshield.dto.*;
import com.be.scamshield.dto.request.LoginGoogleRequest;
import com.be.scamshield.dto.request.RegisterGoogleRequest;
import com.be.scamshield.dto.request.RegisterPersonalRequest;
import com.be.scamshield.dto.request.VerifyContactsRequest;
import com.be.scamshield.dto.response.ContactVerificationResponse;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IAuthService;
import com.be.scamshield.service.IOtpService;
import com.be.scamshield.serviceImpl.ContactVerificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Validated
@Tag(name = "Auth", description = "Các API liên quan đến xác thực, đăng ký")
public class AuthController {

    private final IAuthService authService;
    private final IOtpService otpService;
    private final ContactVerificationService contactVerificationService;

    @PostMapping("/verify-contacts")
    @Operation(summary = "Xác thực OTP điện thoại trước khi đăng ký",
            description = "Chỉ nhận phoneNumber và phoneOtp; trả verificationToken dùng một lần, hạn theo cấu hình .env; expiresAt là giờ Việt Nam để gửi form đăng ký cá nhân hoặc partner. Không xác thực email.")
    public ResponseEntity<BaseResponse<ContactVerificationResponse>> verifyContacts(
            @Valid @RequestBody VerifyContactsRequest request) {
        return ResponseEntity.ok(new BaseResponse<>(true, "Điện thoại đã xác thực; có thể gửi form đăng ký",
                contactVerificationService.verifyContacts(request)));
    }

    @PostMapping("/login")
    @Operation(summary = "Login user", description = "Authenticates user using Username, Email or Phone Number and password. Returns JWT access token in body and sets refresh token in HttpOnly cookie.")
    public ResponseEntity<BaseResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        AuthResponse authResponse = authService.login(request, response);
        return ResponseEntity.ok(new BaseResponse<>(true, "Login successful", authResponse));
    }

    @PostMapping("/login/google")
    @Operation(summary = "Đăng nhập bằng tài khoản Google",
            description = "Xác thực người dùng qua Google ID Token. Trả về access token JWT và lưu refresh token trong HttpOnly cookie.")
    public ResponseEntity<BaseResponse<AuthResponse>> loginGoogle(
            @Valid @RequestBody LoginGoogleRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.loginGoogle(request, response);
        return ResponseEntity.ok(new BaseResponse<>(true, "Đăng nhập Google thành công", authResponse));
    }

    @PostMapping("/refresh-token")
    @Operation(summary = "Refresh access token", description = "Exchanges a valid refresh token from HttpOnly cookie for a new JWT access token.")
    public ResponseEntity<BaseResponse<AuthResponse>> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isBlank()) {
            refreshToken = extractCookie(request, "refreshToken");
        }
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("Refresh token cookie is missing");
        }
        AuthResponse authResponse = authService.refreshToken(refreshToken, response);
        return ResponseEntity.ok(new BaseResponse<>(true, "Token refreshed successfully", authResponse));
    }

    @PostMapping("/change-password")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Change user password", description = "Updates the authenticated user's password after validating their current password.")
    public ResponseEntity<BaseResponse<String>> changePassword(@Valid @RequestBody ChangePasswordRequest request,
                                                               @AuthenticationPrincipal UserPrincipal userPrincipal) {
        authService.changePassword(userPrincipal.getUsername(), request);
        return ResponseEntity.ok(new BaseResponse<>(true, "Password changed successfully"));
    }

    @PostMapping("/logout")
    @Operation(summary = "Logout user", description = "Revokes refresh token cookie and clears user session.")
    public ResponseEntity<BaseResponse<String>> logout(
            @CookieValue(name = "refreshToken", required = false) String refreshToken,
            HttpServletRequest request,
            HttpServletResponse response,
            @AuthenticationPrincipal UserPrincipal userPrincipal) {
        if (refreshToken == null || refreshToken.isBlank()) {
            refreshToken = extractCookie(request, "refreshToken");
        }
        String username = userPrincipal != null ? userPrincipal.getUsername() : null;

        authService.logout(refreshToken, username, response);
        return ResponseEntity.ok(new BaseResponse<>(true, "Logged out successfully"));
    }

    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get current authenticated user profile", description = "Retrieves user details for the currently logged-in user.")
    public ResponseEntity<BaseResponse<UserDto>> getCurrentUserProfile(@AuthenticationPrincipal UserPrincipal userPrincipal) {
        UserDto userProfile = authService.getCurrentUserProfile(userPrincipal.getUsername());
        return ResponseEntity.ok(new BaseResponse<>(true, "User profile retrieved successfully", userProfile));
    }

    @PostMapping("/send-email-otp")
    @Operation(summary = "Gửi OTP qua Email")
    public ResponseEntity<BaseResponse<Void>> sendEmailOtp(
            @RequestParam @NotBlank(message = "Email không được để trống") @Email(message = "Email không đúng định dạng") String email) {
        otpService.sendEmailOtp(email);
        return ResponseEntity.ok(new BaseResponse<>(true, "OTP đã được gửi đến email", null));
    }

    @PostMapping("/send-phone-otp")
    @Operation(summary = "Gửi OTP SMS qua Firebase", description = "Cần reCAPTCHA token lấy từ FE. Giới hạn nội bộ tối đa 10 lượt/24 giờ và 60 giây/số; mã được dùng khi đăng ký.")
    public ResponseEntity<BaseResponse<Void>> sendPhoneOtp(
            @RequestParam @NotBlank(message = "Số điện thoại không được để trống") @Size(max = 30, message = "Số điện thoại tối đa 30 ký tự") String phoneNumber,
            @RequestParam @NotBlank(message = "reCAPTCHA token không được để trống") @Size(max = 8192, message = "reCAPTCHA token quá dài") String recaptchaToken) {
        otpService.sendPhoneOtp(phoneNumber, recaptchaToken);
        return ResponseEntity.ok(new BaseResponse<>(true, "OTP đã được gửi đến số điện thoại", null));
    }

    @PostMapping("/register/personal")
    @Operation(summary = "Đăng ký tài khoản cá nhân", description = "Gọi /api/auth/verify-contacts để xác thực điện thoại trước; gửi form kèm verificationToken. Không cần OTP email.")
    public ResponseEntity<BaseResponse<Void>> registerPersonal(@Valid @RequestBody RegisterPersonalRequest request) {
        authService.registerPersonal(request);
        return ResponseEntity.ok(new BaseResponse<>(true, "Registration successful", null));
    }

    @PostMapping("/register/google")
    @Operation(summary = "Đăng ký cá nhân qua Google",
            description = "Xác thực qua Google ID Token kết hợp xác thực số điện thoại (hỗ trợ verificationToken từ /verify-contacts hoặc phoneOtp trực tiếp). Đăng ký thành công trả về accessToken và lưu refreshToken vào cookie.")
    public ResponseEntity<BaseResponse<AuthResponse>> registerGoogle(
            @Valid @RequestBody RegisterGoogleRequest request,
            HttpServletResponse response) {
        AuthResponse authResponse = authService.registerGoogle(request, response);
        return ResponseEntity.ok(new BaseResponse<>(true, "Google Registration successful", authResponse));
    }

    private String extractCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> name.equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
