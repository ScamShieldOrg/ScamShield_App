package com.be.scamshield.external;

import com.be.scamshield.dto.ContactVerificationEntry;
import com.be.scamshield.service.IContactVerificationStore;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Profile("test")
public class InMemoryContactVerificationStore implements IContactVerificationStore {

    private final ConcurrentHashMap<String, ContactVerificationEntry> store = new ConcurrentHashMap<>();

    @Override
    public void save(ContactVerificationEntry entry, Duration ttl) {
        store.put(entry.getTokenHash(), entry);
    }

    @Override
    public Optional<ContactVerificationEntry> findByTokenHash(String tokenHash) {
        return Optional.ofNullable(store.get(tokenHash));
    }

    @Override
    public int consume(String tokenHash, String expectedPhone, LocalDateTime now) {
        synchronized (store) {
            ContactVerificationEntry entry = store.get(tokenHash);
            if (entry == null) {
                return -1;
            }
            if (entry.getUsedAt() != null || (entry.getExpiresAt() != null && !entry.getExpiresAt().isAfter(now))) {
                return -2;
            }
            if (!entry.getPhoneNumber().equals(expectedPhone)) {
                return -3;
            }
            entry.setUsedAt(now);
            return 0;
        }
    }

    @Override
    public void rollbackConsumption(String tokenHash) {
        synchronized (store) {
            ContactVerificationEntry entry = store.get(tokenHash);
            if (entry != null) {
                entry.setUsedAt(null);
            }
        }
    }

    @Override
    public void clear() {
        store.clear();
    }
}
