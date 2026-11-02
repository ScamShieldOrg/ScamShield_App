package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.ContactVerificationEntry;
import com.be.scamshield.dto.request.VerifyContactsRequest;
import com.be.scamshield.dto.response.ContactVerificationResponse;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.RegistrationConflictException;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IContactVerificationStore;
import com.be.scamshield.service.IOtpService;
import com.be.scamshield.util.VietnamPhoneNumbers;
import lombok.RequiredArgsConstructor;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.net.IDN;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class ContactVerificationService {
    private static final SecureRandom TOKEN_RANDOM = new SecureRandom();
    private final UserRepository userRepository;
    private final IOtpService otpService;
    private final IContactVerificationStore contactVerificationStore;
    private final Clock applicationClock;

    @Value("${app.contact-verification.expiration-ms}")
    private long verificationExpirationMs;

    @PostConstruct
    void validateExpiration() {
        if (verificationExpirationMs <= 0) {
            throw new IllegalArgumentException("Thời gian hết hạn Token xác nhận điện thoại phải lớn hơn 0 ms");
        }
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public ContactVerificationResponse verifyContacts(VerifyContactsRequest request) {
        String phone = VietnamPhoneNumbers.nationalMobile(request.getPhoneNumber());
        if (userRepository.findByPhoneNumber(phone).isPresent()) {
            throw new RegistrationConflictException("Số điện thoại đã được dùng cho một tài khoản");
        }
        otpService.verifyPhoneOtp(phone, request.getPhoneOtp());
        byte[] bytes = new byte[32];
        TOKEN_RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime expiresAt = LocalDateTime.now(applicationClock).plus(Duration.ofMillis(verificationExpirationMs));
        contactVerificationStore.save(ContactVerificationEntry.builder()
                .tokenHash(hashToken(token)).phoneNumber(phone).expiresAt(expiresAt).build(),
                Duration.ofMillis(verificationExpirationMs));
        return new ContactVerificationResponse(token, expiresAt);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void consume(String token, String phone) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
            throw new BadRequestException("Cần xác thực điện thoại trước khi đăng ký");
        }
        String tokenHash = hashToken(token);
        LocalDateTime now = LocalDateTime.now(applicationClock);
        String nationalPhone = VietnamPhoneNumbers.nationalMobile(phone);
        int result = contactVerificationStore.consume(tokenHash, nationalPhone, now);
        if (result == -1) {
            throw new BadRequestException("Mã xác nhận điện thoại không hợp lệ");
        } else if (result == -2) {
            throw new BadRequestException("Mã xác nhận đã dùng hoặc hết hạn; vui lòng xác thực lại");
        } else if (result == -3) {
            throw new BadRequestException("Số điện thoại đã thay đổi; vui lòng xác thực lại");
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        contactVerificationStore.rollbackConsumption(tokenHash);
                    }
                }
            });
        }
    }

    public void validateForRegistration(String token, String phone) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
            throw new BadRequestException("Cần xác thực điện thoại trước khi đăng ký");
        }
        var entry = contactVerificationStore.findByTokenHash(hashToken(token))
                .orElseThrow(() -> new BadRequestException("Mã xác nhận điện thoại không hợp lệ"));
        if (entry.getUsedAt() != null || entry.getExpiresAt() == null
                || !entry.getExpiresAt().isAfter(LocalDateTime.now(applicationClock))) {
            throw new BadRequestException("Mã xác nhận đã dùng hoặc hết hạn; vui lòng xác thực lại");
        }
        if (!VietnamPhoneNumbers.nationalMobile(phone).equals(entry.getPhoneNumber())) {
            throw new BadRequestException("Số điện thoại đã thay đổi; vui lòng xác thực lại");
        }
        // This preflight avoids external API calls for invalid tokens. Atomic consumption still occurs in the write transaction.
    }

    public String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Không thể tạo mã xác nhận", ex);
        }
    }

    public String normalizeEmail(String value) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException("Email không được để trống");
        }
        String email = value.trim().toLowerCase(Locale.ROOT);
        int at = email.lastIndexOf('@');
        if (at <= 0 || at != email.indexOf('@')) {
            throw new BadRequestException("Email không đúng định dạng");
        }
        email = email.substring(0, at + 1) + IDN.toASCII(email.substring(at + 1), IDN.USE_STD3_ASCII_RULES).toLowerCase(Locale.ROOT);
        if (email.length() > 254) {
            throw new BadRequestException("Email sau chuẩn hóa không được vượt quá 254 ký tự");
        }
        return email;
    }

}
