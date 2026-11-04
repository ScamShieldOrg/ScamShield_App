package com.be.scamshield.service;

import com.be.scamshield.dto.ContactVerificationEntry;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

public interface IContactVerificationStore {

    void save(ContactVerificationEntry entry, Duration ttl);

    Optional<ContactVerificationEntry> findByTokenHash(String tokenHash);

    int consume(String tokenHash, String expectedPhone, LocalDateTime now);

    void rollbackConsumption(String tokenHash);

    void clear();
}
