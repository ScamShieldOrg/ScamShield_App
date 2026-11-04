package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.entity.QuotaPolicy;
import com.be.scamshield.entity.User;
import com.be.scamshield.dto.response.UserScamCheckQuotaResponse;
import com.be.scamshield.repository.QuotaPolicyRepository;
import com.be.scamshield.service.IQuotaCounterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScamCheckQuotaService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final IQuotaCounterService counters;
    private final QuotaPolicyRepository policies;
    private final Clock applicationClock;

    @Value("${app.scam-check.registered-daily-limit:10}")
    private int registeredDailyLimit = 10;

    public String reserve(User user, GuestSession guest) {
        int limit = dailyLimit(user);
        if (limit <= 0) {
            log.warn("Scam check quota disabled: ownerType={}, limit={}", user == null ? "GUEST" : "USER", limit);
            throw exhausted();
        }
        ZonedDateTime now = ZonedDateTime.now(applicationClock.withZone(VIETNAM));
        String key = "quota:" + (user == null ? "guest:" + guest.getId() : "user:" + user.getId())
                + ":" + now.toLocalDate();
        Duration ttl = Duration.between(now, now.toLocalDate().plusDays(1).atStartOfDay(VIETNAM));
        long used;
        try {
            // Redis INCR is atomic: simultaneous requests cannot all pass by reading the same old value.
            used = counters.incrementAndGet(key, ttl);
        } catch (RuntimeException ex) {
            log.error("Unable to reserve a scam-check quota slot", ex);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa thể kiểm tra hạn mức. Vui lòng thử lại sau.");
        }
        if (used > limit) {
            log.warn("Scam check quota exhausted: ownerType={}, limit={}", user == null ? "GUEST" : "USER", limit);
            release(key);
            throw exhausted();
        }
        log.info("Scam check quota reserved: ownerType={}, used={}, limit={}", user == null ? "GUEST" : "USER", used, limit);
        return key;
    }

    public void releaseReservation(String key) {
        release(key);
    }

    public UserScamCheckQuotaResponse getUserQuota(User user) {
        ZonedDateTime now = ZonedDateTime.now(applicationClock.withZone(VIETNAM));
        int limit = Math.max(0, dailyLimit(user));
        long count;
        try {
            count = counters.get("quota:user:" + user.getId() + ":" + now.toLocalDate());
        } catch (RuntimeException ex) {
            log.error("Unable to read a user's scam-check quota", ex);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Chưa thể kiểm tra hạn mức. Vui lòng thử lại sau.");
        }
        int used = (int) Math.max(0, Math.min(count, Integer.MAX_VALUE));
        return new UserScamCheckQuotaResponse(user.getId(), user.getFullName(),
                user.getReputationRank() == null ? null : user.getReputationRank().getName(),
                limit, used, Math.max(0, limit - used),
                now.toLocalDate().plusDays(1).atStartOfDay());
    }

    private int dailyLimit(User user) {
        Optional<QuotaPolicy> policy;
        if (user == null) {
            policy = policies.findByNameIgnoreCase("GUEST");
        } else {
            policy = user.getReputationRank() == null ? Optional.empty()
                    : policies.findByRankId(user.getReputationRank().getId());
            if (policy.isEmpty()) policy = policies.findByNameIgnoreCase("REGISTERED_USER");
        }
        // Null means no configured limit; zero explicitly disables checks for this policy.
        return policy.map(QuotaPolicy::getMaxChecksPerDay).orElse(user == null ? 5 : registeredDailyLimit);
    }

    private void release(String key) {
        try {
            counters.decrement(key);
        } catch (RuntimeException ex) {
            log.error("Unable to release a scam-check quota slot for {}", key, ex);
        }
    }

    private ResponseStatusException exhausted() {
        return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Bạn đã sử dụng hết lượt kiểm tra trong ngày. Hạn mức đặt lại lúc 00:00 giờ Việt Nam.");
    }
}
