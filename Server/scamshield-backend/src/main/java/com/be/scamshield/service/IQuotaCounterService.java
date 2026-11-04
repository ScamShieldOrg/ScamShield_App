package com.be.scamshield.service;

import java.time.Duration;

public interface IQuotaCounterService {

    long incrementAndGet(String key, Duration ttl);

    long decrement(String key);

    long get(String key);

    void set(String key, long value, Duration ttl);

    boolean isRateLimited(String key, int maxRequests, Duration window);

    Duration getDurationUntilMidnight();
}
