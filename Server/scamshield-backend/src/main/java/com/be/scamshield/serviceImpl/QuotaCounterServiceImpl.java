package com.be.scamshield.serviceImpl;

import com.be.scamshield.service.IQuotaCounterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

import org.springframework.context.annotation.Profile;

@Service
@Profile("test")
@Slf4j
public class QuotaCounterServiceImpl implements IQuotaCounterService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ConcurrentHashMap<String, CounterEntry> store = new ConcurrentHashMap<>();

    private static class CounterEntry {
        final AtomicLong value;
        volatile long expiresAtEpochMs;

        CounterEntry(long initialValue, long expiresAtEpochMs) {
            this.value = new AtomicLong(initialValue);
            this.expiresAtEpochMs = expiresAtEpochMs;
        }

        boolean isExpired() {
            return expiresAtEpochMs > 0 && System.currentTimeMillis() > expiresAtEpochMs;
        }
    }

    @Override
    public long incrementAndGet(String key, Duration ttl) {
        cleanIfExpired(key);
        long expireEpochMs = (ttl != null && !ttl.isNegative() && !ttl.isZero())
                ? System.currentTimeMillis() + ttl.toMillis()
                : 0L;

        long[] incrementedValue = new long[1];
        store.compute(key, (k, existing) -> {
            if (existing == null || existing.isExpired()) {
                incrementedValue[0] = 1L;
                return new CounterEntry(1L, expireEpochMs);
            }
            incrementedValue[0] = existing.value.incrementAndGet();
            if (existing.expiresAtEpochMs == 0L && expireEpochMs > 0L) {
                existing.expiresAtEpochMs = expireEpochMs;
            }
            return existing;
        });

        // Return this increment's result, not a later value changed by another request.
        return incrementedValue[0];
    }

    @Override
    public long decrement(String key) {
        CounterEntry entry = store.get(key);
        if (entry == null || entry.isExpired()) {
            return 0L;
        }
        long updated = entry.value.decrementAndGet();
        if (updated < 0L) {
            entry.value.set(0L);
            return 0L;
        }
        return updated;
    }

    @Override
    public long get(String key) {
        cleanIfExpired(key);
        CounterEntry entry = store.get(key);
        if (entry == null || entry.isExpired()) {
            return 0L;
        }
        return entry.value.get();
    }

    @Override
    public void set(String key, long value, Duration ttl) {
        long expireEpochMs = (ttl != null && !ttl.isNegative() && !ttl.isZero())
                ? System.currentTimeMillis() + ttl.toMillis()
                : 0L;
        store.put(key, new CounterEntry(value, expireEpochMs));
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

    private void cleanIfExpired(String key) {
        CounterEntry entry = store.get(key);
        if (entry != null && entry.isExpired()) {
            store.remove(key, entry);
        }
    }
}
