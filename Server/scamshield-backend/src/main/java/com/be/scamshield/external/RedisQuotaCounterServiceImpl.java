package com.be.scamshield.external;

import com.be.scamshield.service.IQuotaCounterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class RedisQuotaCounterServiceImpl implements IQuotaCounterService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final StringRedisTemplate redisTemplate;

    @Override
    public long incrementAndGet(String key, Duration ttl) {
        Long value = redisTemplate.opsForValue().increment(key);
        long result = value != null ? value : 1L;

        // Set TTL if newly created or missing expire
        if (ttl != null && !ttl.isNegative() && !ttl.isZero()) {
            if (result == 1L) {
                redisTemplate.expire(key, ttl);
            } else {
                Long currentExpire = redisTemplate.getExpire(key);
                if (currentExpire != null && currentExpire < 0) {
                    redisTemplate.expire(key, ttl);
                }
            }
        }
        return result;
    }

    @Override
    public long decrement(String key) {
        Long value = redisTemplate.opsForValue().decrement(key);
        if (value != null && value < 0L) {
            redisTemplate.opsForValue().set(key, "0");
            return 0L;
        }
        return value != null ? value : 0L;
    }

    @Override
    public long get(String key) {
        String val = redisTemplate.opsForValue().get(key);
        if (val == null) {
            return 0L;
        }
        try {
            return Long.parseLong(val.trim());
        } catch (NumberFormatException e) {
            log.warn("Non-numeric value in Redis quota key [{}]: {}", key, val);
            return 0L;
        }
    }

    @Override
    public void set(String key, long value, Duration ttl) {
        if (ttl != null && !ttl.isNegative() && !ttl.isZero()) {
            redisTemplate.opsForValue().set(key, String.valueOf(value), ttl);
        } else {
            redisTemplate.opsForValue().set(key, String.valueOf(value));
        }
    }

    @Override
    public boolean isRateLimited(String key, int maxRequests, Duration window) {
        long current = incrementAndGet(key, window);
        return current > maxRequests;
    }

    @Override
    public Duration getDurationUntilMidnight() {
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        LocalDateTime midnight = now.toLocalDate().plusDays(1).atStartOfDay();
        return Duration.between(now, midnight);
    }
}
