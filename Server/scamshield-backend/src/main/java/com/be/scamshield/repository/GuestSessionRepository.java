package com.be.scamshield.repository;

import com.be.scamshield.entity.GuestSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface GuestSessionRepository extends JpaRepository<GuestSession, Long> {

    Optional<GuestSession> findBySessionTokenHash(String sessionTokenHash);

    Optional<GuestSession> findFirstByDeviceFingerprintHashAndExpiresAtAfterOrderByCreatedAtDesc(
            String deviceFingerprintHash,
            LocalDateTime now
    );
}
