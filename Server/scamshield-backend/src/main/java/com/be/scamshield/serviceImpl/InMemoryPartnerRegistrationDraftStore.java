package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.PartnerDocumentUploadRequest;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("test")
@RequiredArgsConstructor
public class InMemoryPartnerRegistrationDraftStore implements PartnerRegistrationDraftStore {
    private final ConcurrentHashMap<String, Draft> drafts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Boolean> claims = new ConcurrentHashMap<>();
    private final Clock applicationClock;

    @Override
    public LocalDateTime save(String token, RegisterPartnerRequest request, String verificationToken,
                              List<PartnerDocumentUploadRequest> documents,
                              PartnerBusinessVerificationResponse businessVerification,
                              List<PartnerRegistrationPrecheckResponse.Upload> uploads) {
        LocalDateTime expiresAt = LocalDateTime.now(applicationClock).plus(Duration.ofMinutes(15));
        drafts.put(token, new Draft(request, verificationToken, documents, businessVerification, uploads, expiresAt));
        return expiresAt;
    }

    @Override
    public Optional<Draft> find(String token) {
        Draft draft = drafts.get(token);
        if (draft != null && !draft.expiresAt().isAfter(LocalDateTime.now(applicationClock))) {
            drafts.remove(token);
            return Optional.empty();
        }
        return Optional.ofNullable(draft);
    }

    @Override
    public boolean claim(String token) {
        return claims.putIfAbsent(token, Boolean.TRUE) == null;
    }

    @Override
    public void releaseClaim(String token) {
        claims.remove(token);
    }

    @Override
    public void delete(String token) {
        drafts.remove(token);
    }
}
