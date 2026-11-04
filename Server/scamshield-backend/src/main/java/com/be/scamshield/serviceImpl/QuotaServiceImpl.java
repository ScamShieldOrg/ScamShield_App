package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.response.GuestQuotaResponse;
import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.entity.QuotaPolicy;
import com.be.scamshield.repository.GuestSessionRepository;
import com.be.scamshield.repository.QuotaPolicyRepository;
import com.be.scamshield.service.IGuestSessionService;
import com.be.scamshield.service.IQuotaCounterService;
import com.be.scamshield.service.IQuotaService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuotaServiceImpl implements IQuotaService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final int DEFAULT_GUEST_LIMIT = 5;

    private final IQuotaCounterService quotaCounterService;
    private final IGuestSessionService guestSessionService;
    private final GuestSessionRepository guestSessionRepository;
    private final QuotaPolicyRepository quotaPolicyRepository;

    @Override
    @Transactional(readOnly = true)
    public GuestQuotaResponse getGuestQuota(String sessionToken, HttpServletRequest httpRequest) {
        int limit = resolveGuestDailyLimit();
        String todayStr = LocalDate.now(VIETNAM_ZONE).format(DATE_FORMATTER);
        String quotaKey = buildGuestQuotaKey(sessionToken, httpRequest, todayStr);

        long usedLong = quotaCounterService.get(quotaKey);
        int used = (int) Math.min(usedLong, Integer.MAX_VALUE);
        int remaining = Math.max(0, limit - used);

        LocalDateTime midnight = LocalDate.now(VIETNAM_ZONE).plusDays(1).atStartOfDay();

        log.info("Guest quota checked with key [{}]: used={}/{}, remaining={}", quotaKey, used, limit, remaining);

        return GuestQuotaResponse.builder()
                .limit(limit)
                .used(used)
                .remaining(remaining)
                .resetsAt(midnight)
                .build();
    }

    private int resolveGuestDailyLimit() {
        Optional<QuotaPolicy> policyOpt = quotaPolicyRepository.findByNameIgnoreCase("GUEST");
        if (policyOpt.isEmpty()) {
            policyOpt = quotaPolicyRepository.findByName("GUEST");
        }
        if (policyOpt.isPresent()) {
            Integer maxChecks = policyOpt.get().getMaxChecksPerDay();
            if (maxChecks != null && maxChecks >= 0) {
                return maxChecks;
            }
        }
        return DEFAULT_GUEST_LIMIT;
    }

    private String buildGuestQuotaKey(String sessionToken, HttpServletRequest httpRequest, String todayStr) {
        if (StringUtils.hasText(sessionToken)) {
            String tokenHash = hashSha256(sessionToken.trim());
            Optional<GuestSession> sessionOpt = guestSessionRepository.findBySessionTokenHash(tokenHash);
            if (sessionOpt.isPresent()) {
                return "quota:guest:" + sessionOpt.get().getId() + ":" + todayStr;
            }
            return "quota:guest:token:" + tokenHash + ":" + todayStr;
        }

        String clientIp = guestSessionService.resolveClientIp(httpRequest);
        if (StringUtils.hasText(clientIp)) {
            return "quota:guest:ip:" + hashSha256(clientIp) + ":" + todayStr;
        }

        return "quota:guest:anonymous:" + todayStr;
    }

    private String hashSha256(String input) {
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
