package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.CreateGuestSessionRequest;
import com.be.scamshield.dto.response.GuestSessionResponse;
import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.GuestSessionRepository;
import com.be.scamshield.service.IGuestSessionService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuestSessionServiceImpl implements IGuestSessionService {

    private final GuestSessionRepository guestSessionRepository;

    @Override
    @Transactional
    public GuestSessionResponse createOrGetSession(CreateGuestSessionRequest request, HttpServletRequest httpRequest) {
        LocalDateTime now = LocalDateTime.now();

        // 1. Kiểm tra nếu client gửi sẵn sessionToken hợp lệ (Idempotent theo session token)
        if (request != null && StringUtils.hasText(request.getSessionToken())) {
            String tokenHash = hashString(request.getSessionToken().trim());
            Optional<GuestSession> existingOpt = guestSessionRepository.findBySessionTokenHash(tokenHash);
            if (existingOpt.isPresent()) {
                GuestSession existing = existingOpt.get();
                if (existing.getExpiresAt() == null || existing.getExpiresAt().isAfter(now)) {
                    log.info("Reusing existing guest session ID {}", existing.getId());
                    return GuestSessionResponse.builder()
                            .sessionToken(request.getSessionToken().trim())
                            .expiresAt(existing.getExpiresAt())
                            .build();
                }
            }
        }

        // 2. Thu thập IP và Device Fingerprint
        String clientIp = resolveClientIp(httpRequest);
        String ipHash = StringUtils.hasText(clientIp) ? hashString(clientIp) : null;
        String deviceFp = (request != null && StringUtils.hasText(request.getDeviceFingerprint()))
                ? request.getDeviceFingerprint().trim() : null;
        String deviceFpHash = StringUtils.hasText(deviceFp) ? hashString(deviceFp) : null;

        // 3. Sinh token mới ngẫu nhiên (chỉ lưu hash vào database)
        String rawToken = "gs_" + UUID.randomUUID().toString().replace("-", "");
        String rawTokenHash = hashString(rawToken);
        LocalDateTime expiresAt = now.plusDays(30);

        GuestSession session = GuestSession.builder()
                .sessionTokenHash(rawTokenHash)
                .ipHash(ipHash)
                .deviceFingerprintHash(deviceFpHash)
                .createdAt(now)
                .expiresAt(expiresAt)
                .build();

        GuestSession saved = guestSessionRepository.save(session);
        log.info("Created new guest session ID {} for IP hash {} and device fingerprint hash {}",
                saved.getId(), ipHash, deviceFpHash);

        return GuestSessionResponse.builder()
                .sessionToken(rawToken)
                .expiresAt(expiresAt)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public GuestSession getValidSession(String sessionToken) {
        if (!StringUtils.hasText(sessionToken)) {
            throw new UnauthorizedException("Phiên làm việc của khách không hợp lệ hoặc bị thiếu");
        }
        String tokenHash = hashString(sessionToken.trim());
        GuestSession session = guestSessionRepository.findBySessionTokenHash(tokenHash)
                .orElseThrow(() -> new UnauthorizedException("Không tìm thấy phiên làm việc của khách"));

        if (session.getExpiresAt() != null && session.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Phiên làm việc của khách đã hết hạn. Vui lòng tạo phiên mới.");
        }
        return session;
    }

    @Override
    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }

        return request.getRemoteAddr();
    }

    private String hashString(String input) {
        if (input == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedhash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm is not available", e);
        }
    }
}
