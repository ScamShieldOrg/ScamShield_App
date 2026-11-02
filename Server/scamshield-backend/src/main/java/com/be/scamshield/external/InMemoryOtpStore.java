package com.be.scamshield.external;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.service.IOtpStore;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Profile("test")
public class InMemoryOtpStore implements IOtpStore {

    private final ConcurrentHashMap<String, OtpEntry> entries = new ConcurrentHashMap<>();
    private final List<LocalDateTime> phoneRequests = new CopyOnWriteArrayList<>();

    private String key(OtpType type, String target) {
        return type.name() + ":" + target;
    }

    @Override
    public Optional<OtpEntry> findLatest(String target, OtpType type) {
        OtpEntry entry = entries.get(key(type, target));
        if (entry == null) {
            return Optional.empty();
        }
        return Optional.of(copy(entry));
    }

    @Override
    public void save(OtpEntry entry, Duration ttl) {
        entries.put(key(entry.getType(), entry.getTarget()), copy(entry));
    }

    @Override
    public boolean markVerified(String target, OtpType type) {
        final boolean[] updated = new boolean[1];
        entries.computeIfPresent(key(type, target), (k, existing) -> {
            if (!existing.isVerified()) {
                existing.setVerified(true);
                if (type == OtpType.PHONE) {
                    existing.setProviderSessionInfo(null);
                }
                updated[0] = true;
            }
            return existing;
        });
        return updated[0];
    }

    @Override
    public int incrementAndGetFailedAttempts(String target, OtpType type) {
        final int[] count = new int[1];
        entries.computeIfPresent(key(type, target), (k, existing) -> {
            int next = existing.getFailedAttempts() + 1;
            existing.setFailedAttempts(next);
            count[0] = next;
            return existing;
        });
        return count[0];
    }

    @Override
    public void decrementFailedAttempts(String target, OtpType type) {
        entries.computeIfPresent(key(type, target), (k, existing) -> {
            if (existing.getFailedAttempts() > 0) {
                existing.setFailedAttempts(existing.getFailedAttempts() - 1);
            }
            return existing;
        });
    }

    @Override
    public void decrementFailedAttemptsIfMatching(OtpEntry expected) {
        if (expected.getOtpCode() == null || expected.getCreatedAt() == null) {
            return;
        }
        entries.computeIfPresent(key(expected.getType(), expected.getTarget()), (k, existing) -> {
            if (expected.getOtpCode().equals(existing.getOtpCode())
                    && expected.getCreatedAt().equals(existing.getCreatedAt())
                    && existing.getFailedAttempts() > 0) {
                existing.setFailedAttempts(existing.getFailedAttempts() - 1);
            }
            return existing;
        });
    }

    @Override
    public void recordPhoneOtpRequest(LocalDateTime timestamp) {
        phoneRequests.add(timestamp);
    }

    @Override
    public long countPhoneOtpRequestsSince(LocalDateTime since) {
        return phoneRequests.stream()
                .filter(t -> t != null && t.isAfter(since))
                .count();
    }

    @Override
    public void clear() {
        entries.clear();
        phoneRequests.clear();
    }

    private OtpEntry copy(OtpEntry original) {
        return OtpEntry.builder()
                .target(original.getTarget())
                .type(original.getType())
                .otpCode(original.getOtpCode())
                .provider(original.getProvider())
                .providerSessionInfo(original.getProviderSessionInfo())
                .createdAt(original.getCreatedAt())
                .expiresAt(original.getExpiresAt())
                .isVerified(original.isVerified())
                .failedAttempts(original.getFailedAttempts())
                .build();
    }
}
