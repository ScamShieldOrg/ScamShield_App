package com.be.scamshield.external;

import com.be.scamshield.config.FirebasePhoneProperties;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.OtpRateLimitException;
import com.be.scamshield.exception.SmsProviderException;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FirebasePhoneClient {
    private final RestClient firebasePhoneRestClient;
    private final FirebasePhoneProperties properties;
    private static final Set<String> INVALID_CODE_ERRORS = Set.of(
            "INVALID_CODE", "INVALID_VERIFICATION_CODE", "SESSION_EXPIRED",
            "INVALID_SESSION_INFO", "INVALID_VERIFICATION_ID", "MISSING_CODE");

    public void requireConfigured() {
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) {
            throw new SmsProviderException("Chưa cấu hình FIREBASE_WEB_API_KEY để gửi OTP SMS");
        }
    }

    public String send(String e164Phone, String recaptchaToken) {
        requireConfigured();
        try {
            SendResponse response = firebasePhoneRestClient.post()
                    .uri(builder -> builder.path("/accounts:sendVerificationCode").queryParam("key", properties.getApiKey()).build())
                    .contentType(MediaType.APPLICATION_JSON).header("X-Firebase-Locale", "vi")
                    .body(Map.of("phoneNumber", e164Phone, "recaptchaToken", recaptchaToken))
                    .retrieve().body(SendResponse.class);
            if (response == null || response.sessionInfo() == null || response.sessionInfo().isBlank()) {
                throw new SmsProviderException("Firebase chưa trả về phiên xác thực SMS hợp lệ");
            }
            return response.sessionInfo();
        } catch (HttpClientErrorException ex) {
            String code = errorCode(ex);
            if (ex.getStatusCode().value() == 429 || code.equals("TOO_MANY_ATTEMPTS_TRY_LATER") || code.equals("QUOTA_EXCEEDED")) {
                throw new OtpRateLimitException("Firebase đã giới hạn gửi SMS; vui lòng thử lại sau");
            }
            if (code.contains("CAPTCHA") || code.equals("INVALID_APP_CREDENTIAL") || code.equals("MISSING_APP_CREDENTIAL")) {
                throw new BadRequestException("reCAPTCHA không hợp lệ hoặc đã hết hạn; vui lòng xác thực lại");
            }
            if (code.equals("INVALID_PHONE_NUMBER")) {
                throw new BadRequestException("Số điện thoại không được Firebase chấp nhận");
            }
            String hint = switch (code) {
                case "BILLING_NOT_ENABLED" -> "Project chưa bật billing/Blaze để gửi SMS thật";
                case "OPERATION_NOT_ALLOWED" -> "Chưa bật Phone Authentication trong Firebase";
                case "SMS_REGION_POLICY_VIOLATION" -> "SMS region policy chưa cho phép gửi đến Việt Nam";
                case "PROJECT_NOT_FOUND", "CONFIGURATION_NOT_FOUND", "API_KEY_INVALID" -> "Kiểm tra API key và cấu hình Firebase project";
                default -> "Kiểm tra Phone Authentication, billing, SMS region và giới hạn API key trong Firebase";
            };
            throw new SmsProviderException("Firebase từ chối gửi SMS (" + code + "): " + hint);
        } catch (RestClientException ex) {
            throw new SmsProviderException("Không kết nối được dịch vụ SMS; vui lòng thử lại sau");
        }
    }

    public void verify(String sessionInfo, String code, String expectedE164Phone) {
        requireConfigured();
        try {
            VerifyResponse response = firebasePhoneRestClient.post()
                    .uri(builder -> builder.path("/accounts:signInWithPhoneNumber").queryParam("key", properties.getApiKey()).build())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("sessionInfo", sessionInfo, "code", code))
                    .retrieve().body(VerifyResponse.class);
            if (response == null || !expectedE164Phone.equals(response.phoneNumber())) {
                throw new IllegalArgumentException("Phiên OTP không khớp với số điện thoại đăng ký");
            }
            // Firebase tokens are deliberately neither stored nor returned: local accounts use BCrypt.
        } catch (HttpClientErrorException ex) {
            String error = errorCode(ex);
            if (INVALID_CODE_ERRORS.contains(error)) {
                throw new IllegalArgumentException("Mã OTP không đúng hoặc phiên xác thực đã hết hạn");
            }
            if (ex.getStatusCode().value() == 429 || error.equals("TOO_MANY_ATTEMPTS_TRY_LATER")) {
                throw new OtpRateLimitException("Firebase đã giới hạn xác thực OTP; vui lòng thử lại sau");
            }
            throw new SmsProviderException("Dịch vụ xác thực SMS chưa sẵn sàng; vui lòng thử lại sau");
        } catch (RestClientException ex) {
            throw new SmsProviderException("Không kết nối được dịch vụ xác thực SMS; vui lòng thử lại sau");
        }
    }

    private String errorCode(HttpClientErrorException ex) {
        try {
            ErrorResponse response = ex.getResponseBodyAs(ErrorResponse.class);
            if (response != null && response.error() != null && response.error().message() != null) {
                String code = response.error().message().split("\\s*:\\s*", 2)[0].trim();
                return code.matches("[A-Z][A-Z_]{1,79}") ? code : "UNKNOWN";
            }
        } catch (RestClientException | IllegalStateException ignored) {
            // Never expose raw provider payloads, URLs, API keys or tokens in errors.
        }
        return "UNKNOWN";
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SendResponse(String sessionInfo) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record VerifyResponse(String phoneNumber) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ErrorResponse(ProviderError error) { }
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ProviderError(String message) { }
}
