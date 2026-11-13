package com.be.scamshield.serviceImpl;

import com.be.scamshield.service.PartnerEmailService;
import com.be.scamshield.service.PartnerPasswordSetupService;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.PartnerPasswordEmailStatus;
import com.be.scamshield.entity.PartnerPasswordLink;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.PartnerReviewConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.PartnerPasswordLinkRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.RefreshTokenRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerPasswordSetupServiceImpl implements PartnerPasswordSetupService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final PartnerPasswordLinkRepository links;
    private final PartnerProfileRepository profiles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final PartnerEmailService emailService;
    private final Clock applicationClock;

    @Value("${app.ui-base-url:http://localhost:3001}")
    private String uiBaseUrl;

    @Transactional
    @Override
    public void issue(Long partnerId) {
        var profile = profiles.findByIdForReview(partnerId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ đối tác"));
        if (profile.getVerificationStatus() != PartnerVerificationStatus.VERIFIED
                || profile.getPasswordSetupCompletedAt() != null) {
            throw new PartnerReviewConflictException("Hồ sơ không đủ điều kiện gửi link đặt mật khẩu");
        }
        var now = LocalDateTime.now(applicationClock);
        links.findByPartnerIdAndConsumedAtIsNull(partnerId).forEach(link -> link.setConsumedAt(now));
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        links.save(PartnerPasswordLink.builder().partner(profile).tokenHash(hash(token))
                .expiresAt(now.plusMinutes(10)).build());
        profile.setPasswordLinkEmailStatus(PartnerPasswordEmailStatus.PENDING);
        String email = profile.getCorporateEmail();
        String url = uiBaseUrl.replaceAll("/+$", "") + "/reset-password?token=" + token;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try {
                    emailService.sendPassword(partnerId, email, url, hash(token));
                } catch (Exception ex) {
                    log.error("Không thể cập nhật trạng thái gửi link cho hồ sơ {}", partnerId, ex);
                }
            }
        });
    }

    @Transactional
    @Override
    public void setup(String token, String newPassword) {
        if (token == null || !token.matches("[A-Za-z0-9_-]{43}")) {
            throw new BadRequestException("Link đặt mật khẩu không hợp lệ hoặc đã hết hạn");
        }
        String tokenHash = hash(token);
        Long partnerId = links.findPartnerIdByTokenHash(tokenHash)
                .orElseThrow(() -> new BadRequestException("Link đặt mật khẩu không hợp lệ hoặc đã hết hạn"));
        var profile = profiles.findByIdForReview(partnerId)
                .orElseThrow(() -> new BadRequestException("Link đặt mật khẩu không hợp lệ hoặc đã hết hạn"));
        var link = links.findLockedByTokenHash(tokenHash)
                .orElseThrow(() -> new BadRequestException("Link đặt mật khẩu không hợp lệ hoặc đã hết hạn"));
        var now = LocalDateTime.now(applicationClock);
        if (link.getConsumedAt() != null || !link.getExpiresAt().isAfter(now)
                || profile.getPasswordSetupCompletedAt() != null
                || profile.getVerificationStatus() != PartnerVerificationStatus.VERIFIED) {
            throw new BadRequestException("Link đặt mật khẩu không hợp lệ hoặc đã hết hạn");
        }
        profile.getUser().setPasswordHash(passwordEncoder.encode(newPassword));
        profile.setPasswordSetupCompletedAt(now);
        link.setConsumedAt(now);
        refreshTokens.deleteByUser(profile.getUser());
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 không khả dụng", ex);
        }
    }
}
