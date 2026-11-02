package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.FirebasePhoneClient;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.SmsProviderException;
import com.be.scamshield.service.IOtpService;
import com.be.scamshield.service.IOtpStore;
import com.be.scamshield.util.VietnamPhoneNumbers;
import lombok.RequiredArgsConstructor;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.annotation.Transactional;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.UnsupportedEncodingException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;
import java.nio.charset.StandardCharsets;
import java.io.IOException;

import java.time.LocalDateTime;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.security.SecureRandom;
import java.net.IDN;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class OtpServiceImpl implements IOtpService {

    private final IOtpStore otpStore;
    private final JavaMailSender mailSender;
    private final FirebasePhoneClient firebasePhoneClient;
    private final SmsOtpReservationService smsReservationService;
    private final Clock applicationClock;

    @Value("${app.otp.email-expiration-ms}")
    private long emailOtpExpirationMs;

    @Value("${app.otp.phone-expiration-ms}")
    private long phoneOtpExpirationMs;

    @PostConstruct
    void validateExpiration() {
        if (emailOtpExpirationMs <= 0) {
            throw new IllegalArgumentException("Thời gian hết hạn OTP email phải lớn hơn 0 ms");
        }
        if (phoneOtpExpirationMs <= 0) {
            throw new IllegalArgumentException("Thời gian hết hạn OTP điện thoại phải lớn hơn 0 ms");
        }
    }

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${spring.mail.username:default_email}")
    private String fromEmail;

    @Value("${spring.mail.display-name:ScamShield}")
    private String mailDisplayName;

    private String generateOtp() {
        return String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
    }

    private String getHtmlTemplate() {
        try {
            ClassPathResource resource = new ClassPathResource("templates/otp-email.html");
            return StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "<p>Mã OTP của bạn là: <b>{{OTP_CODE}}</b></p>";
        }
    }

    private void checkRateLimit(String target, OtpType type) {
        Optional<OtpEntry> lastOtpOpt = otpStore.findLatest(target, type);
        if (lastOtpOpt.isPresent()) {
            OtpEntry lastOtp = lastOtpOpt.get();
            if (lastOtp.getCreatedAt() != null && lastOtp.getCreatedAt().plusMinutes(1).isAfter(LocalDateTime.now(applicationClock))) {
                throw new IllegalArgumentException("Vui lòng đợi 1 phút trước khi yêu cầu mã mới.");
            }
        }
    }

    @Override
    @Transactional
    public void sendEmailOtp(String email) {
        email = normalizeEmail(email);
        checkRateLimit(email, OtpType.EMAIL);
        String otp = generateOtp();
        LocalDateTime now = LocalDateTime.now(applicationClock);

        OtpEntry otpEntry = OtpEntry.builder()
                .target(email)
                .otpCode(otp)
                .type(OtpType.EMAIL)
                .createdAt(now)
                .expiresAt(now.plus(Duration.ofMillis(emailOtpExpirationMs)))
                .isVerified(false)
                .failedAttempts(0)
                .build();
        otpStore.save(otpEntry, Duration.ofMillis(emailOtpExpirationMs));

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail, mailDisplayName);
            helper.setTo(email);
            helper.setSubject("Mã xác thực ScamShield");
            
            String htmlContent = getHtmlTemplate().replace("{{OTP_CODE}}", otp)
                    .replace("{{OTP_EXPIRATION_SECONDS}}", Long.toString((long) Math.ceil(emailOtpExpirationMs / 1000.0)));
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException | org.springframework.mail.MailException e) {
            throw new RuntimeException("Lỗi khi gửi email: " + e.getMessage());
        }
    }

    @Override
    public void sendPhoneOtp(String phoneNumber, String recaptchaToken) {
        String nationalPhone = VietnamPhoneNumbers.nationalMobile(phoneNumber);
        if (recaptchaToken == null || recaptchaToken.isBlank() || recaptchaToken.length() > 8192) {
            throw new BadRequestException("Cần reCAPTCHA token hợp lệ trước khi gửi OTP SMS");
        }
        firebasePhoneClient.requireConfigured();
        OtpEntry reservation;
        try {
            reservation = smsReservationService.reserve(nationalPhone);
        } catch (DataIntegrityViolationException | ConcurrencyFailureException ex) {
            // A rejected reservation must never reach Firebase, including serialization conflicts.
            throw new SmsProviderException("Không thể đặt lượt gửi SMS lúc này; vui lòng thử lại sau");
        }
        String session = firebasePhoneClient.send(VietnamPhoneNumbers.e164(nationalPhone), recaptchaToken);
        reservation.setProviderSessionInfo(session);
        otpStore.save(reservation, Duration.ofMillis(phoneOtpExpirationMs));
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = IllegalArgumentException.class)
    public boolean verifyOtp(String target, String otpCode, OtpType type) {
        markVerified(validateOtp(target, otpCode, type));
        return true;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY, noRollbackFor = IllegalArgumentException.class)
    public void verifyPhoneOtp(String phone, String phoneCode) {
        // Consume the challenge in the verification transaction; token persistence failures restore it.
        markVerified(validateContactOtp(phone, phoneCode, OtpType.PHONE, "điện thoại"));
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY, noRollbackFor = IllegalArgumentException.class)
    public boolean verifyContactOtps(String email, String emailCode, String phone, String phoneCode) {
        OtpEntry emailOtp = validateContactOtp(email, emailCode, OtpType.EMAIL, "email");
        OtpEntry phoneOtp;
        try {
            phoneOtp = validateContactOtp(phone, phoneCode, OtpType.PHONE, "điện thoại");
        } catch (RuntimeException ex) {
            // The correct email code remains unconsumed; release only this attempt's reservation.
            otpStore.decrementFailedAttemptsIfMatching(emailOtp);
            throw ex;
        }
        // Both checks must succeed before either challenge is consumed.
        markVerified(emailOtp);
        markVerified(phoneOtp);
        return true;
    }

    private OtpEntry validateContactOtp(String target, String code, OtpType type, String channel) {
        try {
            return validateOtp(target, code, type);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("OTP " + channel + " không hợp lệ: " + ex.getMessage(), ex);
        }
    }

    private void markVerified(OtpEntry otp) {
        boolean success = otpStore.markVerified(otp.getTarget(), otp.getType());
        if (!success) {
            throw new IllegalArgumentException("Vui lòng gửi yêu cầu lấy mã OTP mới");
        }
        otp.setVerified(true);
        String sessionInfo = otp.getProviderSessionInfo();
        if (otp.getType() == OtpType.PHONE) {
            otp.setProviderSessionInfo(null);
        }

        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        otp.setVerified(false);
                        otp.setProviderSessionInfo(sessionInfo);
                        Duration remaining = Duration.between(LocalDateTime.now(applicationClock), otp.getExpiresAt());
                        if (remaining.isNegative() || remaining.isZero()) {
                            remaining = Duration.ofSeconds(60);
                        }
                        otpStore.save(otp, remaining);
                    }
                }
            });
        }
    }

    private OtpEntry validateOtp(String target, String otpCode, OtpType type) {
        if (type == OtpType.PHONE) {
            target = VietnamPhoneNumbers.nationalMobile(target);
        } else if (type == OtpType.EMAIL) {
            target = normalizeEmail(target);
        } else {
            throw new IllegalArgumentException("Loại OTP không hợp lệ");
        }
        Optional<OtpEntry> otpOpt = otpStore.findLatest(target, type);

        if (otpOpt.isPresent()) {
            OtpEntry otpEntry = otpOpt.get();
            
            if (otpEntry.isVerified()) {
                throw new IllegalArgumentException("Vui lòng gửi yêu cầu lấy mã OTP mới");
            }

            LocalDateTime now = LocalDateTime.now(applicationClock);
            if (!otpEntry.getExpiresAt().isAfter(now)) {
                throw new IllegalArgumentException("Vui lòng gửi yêu cầu lấy mã OTP mới");
            }

            if (type == OtpType.PHONE && (otpCode == null || !otpCode.matches("^[0-9]{6}$"))) {
                throw new IllegalArgumentException("OTP SMS phải gồm 6 chữ số");
            }

            int attempt = otpStore.incrementAndGetFailedAttempts(target, type);
            if (attempt > 5) {
                throw new IllegalArgumentException("Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
            }

            if (type == OtpType.PHONE) {
                if (!"FIREBASE".equals(otpEntry.getProvider()) || otpEntry.getProviderSessionInfo() == null) {
                    throw new IllegalArgumentException("Phiên SMS chưa sẵn sàng; vui lòng yêu cầu OTP mới");
                }
                try {
                    firebasePhoneClient.verify(otpEntry.getProviderSessionInfo(), otpCode,
                            VietnamPhoneNumbers.e164(target));
                } catch (IllegalArgumentException ex) {
                    int attemptsLeft = 5 - attempt;
                    throw new IllegalArgumentException("OTP SMS không đúng hoặc đã hết hạn. Còn "
                            + attemptsLeft + " lần thử; hết lượt cần yêu cầu OTP mới.");
                } catch (RuntimeException ex) {
                    // Provider network or server outage does not count as incorrect code
                    otpStore.decrementFailedAttempts(target, type);
                    throw ex;
                }
                otpEntry.setFailedAttempts(attempt);
                return otpEntry;
            }
            if (otpEntry.getOtpCode().equals(otpCode)) {
                otpEntry.setFailedAttempts(attempt);
                return otpEntry;
            } else {
                int attemptsLeft = 5 - attempt;
                if (attemptsLeft > 0) {
                    throw new IllegalArgumentException("Mã OTP không chính xác. Bạn còn " + attemptsLeft + " lần thử.");
                } else {
                    throw new IllegalArgumentException("Mã OTP đã bị vô hiệu hóa do nhập sai quá 5 lần. Vui lòng yêu cầu mã mới.");
                }
            }
        }
        
        throw new IllegalArgumentException("Chưa có yêu cầu gửi mã OTP nào cho thiết bị này");
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email không được để trống");
        }
        String normalized = email.trim().toLowerCase(Locale.ROOT);
        int at = normalized.lastIndexOf('@');
        if (at <= 0 || at != normalized.indexOf('@') || at == normalized.length() - 1) {
            throw new BadRequestException("Email không đúng định dạng");
        }
        return normalized.substring(0, at + 1)
                + IDN.toASCII(normalized.substring(at + 1), IDN.USE_STD3_ASCII_RULES);
    }
}
