package com.be.scamshield.external;

import com.be.scamshield.dto.ContactVerificationEntry;
import com.be.scamshield.service.IContactVerificationStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
@Profile("!test")
@RequiredArgsConstructor
@Slf4j
public class RedisContactVerificationStore implements IContactVerificationStore {

    private static final String PREFIX = "contact_verify:";

    private static final String CONSUME_LUA =
            "local key = KEYS[1]\n" +
            "local expectedPhone = ARGV[1]\n" +
            "local nowStr = ARGV[2]\n" +
            "if redis.call('EXISTS', key) == 0 then return -1 end\n" +
            "local usedAt = redis.call('HGET', key, 'usedAt')\n" +
            "if usedAt and usedAt ~= '' then return -2 end\n" +
            "local expiresAt = redis.call('HGET', key, 'expiresAt')\n" +
            "if not expiresAt or expiresAt == '' or expiresAt <= nowStr then return -2 end\n" +
            "local phone = redis.call('HGET', key, 'phoneNumber')\n" +
            "if phone ~= expectedPhone then return -3 end\n" +
            "redis.call('HSET', key, 'usedAt', nowStr)\n" +
            "return 0";

    private final StringRedisTemplate redisTemplate;

    private String key(String tokenHash) {
        return PREFIX + tokenHash;
    }

    @Override
    public void save(ContactVerificationEntry entry, Duration ttl) {
        String k = key(entry.getTokenHash());
        Map<String, String> map = new HashMap<>();
        map.put("tokenHash", entry.getTokenHash());
        map.put("phoneNumber", entry.getPhoneNumber());
        if (entry.getExpiresAt() != null) {
            map.put("expiresAt", entry.getExpiresAt().toString());
        }
        if (entry.getUsedAt() != null) {
            map.put("usedAt", entry.getUsedAt().toString());
        } else {
            map.put("usedAt", "");
        }

        redisTemplate.opsForHash().putAll(k, map);
        if (ttl != null && !ttl.isNegative() && !ttl.isZero()) {
            redisTemplate.expire(k, ttl);
        }
    }

    @Override
    public Optional<ContactVerificationEntry> findByTokenHash(String tokenHash) {
        String k = key(tokenHash);
        Map<Object, Object> entries = redisTemplate.opsForHash().entries(k);
        if (entries == null || entries.isEmpty()) {
            return Optional.empty();
        }
        String usedAtStr = (String) entries.get("usedAt");
        ContactVerificationEntry entry = ContactVerificationEntry.builder()
                .tokenHash((String) entries.get("tokenHash"))
                .phoneNumber((String) entries.get("phoneNumber"))
                .expiresAt(entries.get("expiresAt") != null ? LocalDateTime.parse((String) entries.get("expiresAt")) : null)
                .usedAt(usedAtStr != null && !usedAtStr.isBlank() ? LocalDateTime.parse(usedAtStr) : null)
                .build();
        return Optional.of(entry);
    }

    @Override
    public int consume(String tokenHash, String expectedPhone, LocalDateTime now) {
        String k = key(tokenHash);
        DefaultRedisScript<Long> redisScript = new DefaultRedisScript<>(CONSUME_LUA, Long.class);
        Long result = redisTemplate.execute(redisScript, Collections.singletonList(k), expectedPhone, now.toString());
        return result != null ? result.intValue() : -1;
    }

    @Override
    public void rollbackConsumption(String tokenHash) {
        String k = key(tokenHash);
        redisTemplate.opsForHash().put(k, "usedAt", "");
    }

    @Override
    public void clear() {
        Set<String> keys = redisTemplate.keys(PREFIX + "*");
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
        }
    }
}
