package com.be.scamshield.external;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.service.IOtpStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class RedisOtpStore implements IOtpStore {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final String OTP_DATA_PREFIX = "otp:data:";
    private static final String SMS_REQUESTS_KEY = "otp:sms:requests";

    private static final String MARK_VERIFIED_LUA =
            "local key = KEYS[1]\n" +
            "local isPhone = ARGV[1]\n" +
            "if redis.call('EXISTS', key) == 0 then return 0 end\n" +
            "local isVerified = redis.call('HGET', key, 'isVerified')\n" +
            "if isVerified == 'true' then return 0 end\n" +
            "redis.call('HSET', key, 'isVerified', 'true')\n" +
            "if isPhone == 'true' then\n" +
            "    redis.call('HDEL', key, 'providerSessionInfo')\n" +
            "end\n" +
            "return 1";

    private static final String DECREMENT_FAILED_LUA =
            "local key = KEYS[1]\n" +
            "if redis.call('EXISTS', key) == 0 then return 0 end\n" +
            "local current = tonumber(redis.call('HGET', key, 'failedAttempts') or '0')\n" +
            "if current > 0 then\n" +
            "    return redis.call('HINCRBY', key, 'failedAttempts', -1)\n" +
            "end\n" +
            "return 0";

    private static final String DECREMENT_MATCHING_FAILED_LUA =
            "if redis.call('HGET', KEYS[1], 'otpCode') ~= ARGV[1] " +
            "or redis.call('HGET', KEYS[1], 'createdAt') ~= ARGV[2] then return 0 end\n" +
            DECREMENT_FAILED_LUA;

    private final StringRedisTemplate redisTemplate;

    private String key(OtpType type, String target) {
        return OTP_DATA_PREFIX + type.name() + ":" + target;
    }

    @Override
    public Optional<OtpEntry> findLatest(String target, OtpType type) {
        String k = key(type, target);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(k);
        if (entries == null || entries.isEmpty()) {
            return Optional.empty();
        }
        OtpEntry entry = OtpEntry.builder()
                .target((String) entries.get("target"))
                .type(entries.get("type") != null ? OtpType.valueOf((String) entries.get("type")) : type)
                .otpCode((String) entries.get("otpCode"))
                .provider((String) entries.get("provider"))
                .providerSessionInfo((String) entries.get("providerSessionInfo"))
                .createdAt(entries.get("createdAt") != null ? LocalDateTime.parse((String) entries.get("createdAt")) : null)
                .expiresAt(entries.get("expiresAt") != null ? LocalDateTime.parse((String) entries.get("expiresAt")) : null)
                .isVerified(Boolean.parseBoolean((String) entries.get("isVerified")))
                .failedAttempts(entries.get("failedAttempts") != null ? Integer.parseInt((String) entries.get("failedAttempts")) : 0)
                .build();
        return Optional.of(entry);
    }

    @Override
    public void save(OtpEntry entry, Duration ttl) {
        String k = key(entry.getType(), entry.getTarget());
        Map<String, String> map = new HashMap<>();
        map.put("target", entry.getTarget());
        map.put("type", entry.getType().name());
        if (entry.getOtpCode() != null) {
            map.put("otpCode", entry.getOtpCode());
        }
        if (entry.getProvider() != null) {
            map.put("provider", entry.getProvider());
        }
        if (entry.getProviderSessionInfo() != null) {
            map.put("providerSessionInfo", entry.getProviderSessionInfo());
        }
        if (entry.getCreatedAt() != null) {
            map.put("createdAt", entry.getCreatedAt().toString());
        }
        if (entry.getExpiresAt() != null) {
            map.put("expiresAt", entry.getExpiresAt().toString());
        }
        map.put("isVerified", String.valueOf(entry.isVerified()));
        map.put("failedAttempts", String.valueOf(entry.getFailedAttempts()));

        redisTemplate.opsForHash().putAll(k, map);
        if (ttl != null && !ttl.isNegative() && !ttl.isZero()) {
            redisTemplate.expire(k, ttl);
        }
    }

    @Override
    public boolean markVerified(String target, OtpType type) {
        String k = key(type, target);
        DefaultRedisScript<Long> script = new DefaultRedisScript<>(MARK_VERIFIED_LUA, Long.class);
        Long result = redisTemplate.execute(script, Collections.singletonList(k), String.valueOf(type == OtpType.PHONE));
        return result != null && result == 1L;
    }

    @Override
    public int incrementAndGetFailedAttempts(String target, OtpType type) {
        String k = key(type, target);
        Long count = redisTemplate.opsForHash().increment(k, "failedAttempts", 1);
        return count != null ? count.intValue() : 1;
    }

    @Override
    public void decrementFailedAttempts(String target, OtpType type) {
        String k = key(type, target);
        DefaultRedisScript<Long> script = new DefaultRedisScript<>(DECREMENT_FAILED_LUA, Long.class);
        redisTemplate.execute(script, Collections.singletonList(k));
    }

    @Override
    public void decrementFailedAttemptsIfMatching(OtpEntry expected) {
        if (expected.getOtpCode() == null || expected.getCreatedAt() == null) {
            return;
        }
        DefaultRedisScript<Long> script = new DefaultRedisScript<>(DECREMENT_MATCHING_FAILED_LUA, Long.class);
        redisTemplate.execute(script, Collections.singletonList(key(expected.getType(), expected.getTarget())),
                expected.getOtpCode(), expected.getCreatedAt().toString());
    }

    @Override
    public void recordPhoneOtpRequest(LocalDateTime timestamp) {
        long epochMs = timestamp.atZone(VIETNAM_ZONE).toInstant().toEpochMilli();
        redisTemplate.opsForZSet().add(SMS_REQUESTS_KEY, UUID.randomUUID().toString(), epochMs);
        redisTemplate.expire(SMS_REQUESTS_KEY, Duration.ofHours(48));
    }

    @Override
    public long countPhoneOtpRequestsSince(LocalDateTime since) {
        long min = since.atZone(VIETNAM_ZONE).toInstant().toEpochMilli();
        double max = Double.POSITIVE_INFINITY;
        Long count = redisTemplate.opsForZSet().count(SMS_REQUESTS_KEY, (double) (min + 1), max);
        redisTemplate.opsForZSet().removeRangeByScore(SMS_REQUESTS_KEY, 0, min - 1);
        return count != null ? count : 0L;
    }

    @Override
    public void clear() {
        Set<String> keys = redisTemplate.keys("otp:*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
