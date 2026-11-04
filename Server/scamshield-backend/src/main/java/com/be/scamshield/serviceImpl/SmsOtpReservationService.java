package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.config.FirebasePhoneProperties;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.exception.OtpRateLimitException;
import com.be.scamshield.service.IOtpStore;
import lombok.RequiredArgsConstructor;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class SmsOtpReservationService {
    private final IOtpStore otpStore;
    private final FirebasePhoneProperties properties;
    private final Clock applicationClock;

    @Value("${app.otp.phone-expiration-ms}")
    private long phoneOtpExpirationMs;

    @PostConstruct
    void validateExpiration() {
        if (phoneOtpExpirationMs <= 0) {
            throw new IllegalArgumentException("Thời gian hết hạn OTP điện thoại phải lớn hơn 0 ms");
        }
    }

    public synchronized OtpEntry reserve(String nationalPhone) {
        LocalDateTime now = LocalDateTime.now(applicationClock);
        if (otpStore.countPhoneOtpRequestsSince(now.minusHours(24))
                >= properties.getMaxRequestsPer24Hours()) {
            throw new OtpRateLimitException("Đã đạt giới hạn gửi OTP SMS của dự án trong 24 giờ; vui lòng thử lại sau");
        }
        otpStore.findLatest(nationalPhone, OtpType.PHONE).ifPresent(latest -> {
            if (latest.getCreatedAt() != null && latest.getCreatedAt().plusSeconds(60).isAfter(now)) {
                throw new OtpRateLimitException("Vui lòng đợi 60 giây trước khi yêu cầu OTP SMS mới");
            }
        });
        OtpEntry entry = OtpEntry.builder()
                .target(nationalPhone)
                .type(OtpType.PHONE)
                .provider("FIREBASE")
                .createdAt(now)
                .expiresAt(now.plus(Duration.ofMillis(phoneOtpExpirationMs)))
                .isVerified(false)
                .failedAttempts(0)
                .build();
        otpStore.save(entry, Duration.ofMillis(phoneOtpExpirationMs));
        otpStore.recordPhoneOtpRequest(now);
        return entry;
    }
}
