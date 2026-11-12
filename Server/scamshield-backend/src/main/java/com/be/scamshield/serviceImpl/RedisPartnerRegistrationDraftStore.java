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
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@Profile("!test")
@RequiredArgsConstructor
public class RedisPartnerRegistrationDraftStore implements PartnerRegistrationDraftStore {
    private static final String KEY_PREFIX = "partner-registration:draft:";
    private static final Duration TTL = Duration.ofMinutes(60);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final Clock applicationClock;

    @Override
    public LocalDateTime save(String token, RegisterPartnerRequest request, String verificationToken,
                              List<PartnerDocumentUploadRequest> documents,
                              PartnerBusinessVerificationResponse businessVerification,
                              List<PartnerRegistrationPrecheckResponse.Upload> uploads) {
        LocalDateTime expiresAt = LocalDateTime.now(applicationClock).plus(TTL);
        try {
            String value = objectMapper.writeValueAsString(new Draft(
                    request, verificationToken, documents, businessVerification, uploads, expiresAt));
            redis.opsForValue().set(KEY_PREFIX + token, value, TTL);
            return expiresAt;
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể tạo phiên đăng ký đối tác", ex);
        }
    }

    @Override
    public Optional<Draft> find(String token) {
        String value = redis.opsForValue().get(KEY_PREFIX + token);
        if (value == null) return Optional.empty();
        try {
            return Optional.of(objectMapper.readValue(value, Draft.class));
        } catch (Exception ex) {
            redis.delete(KEY_PREFIX + token);
            throw new IllegalStateException("Không thể đọc phiên đăng ký đối tác", ex);
        }
    }

    @Override
    public LocalDateTime refresh(String token) {
        if (!Boolean.TRUE.equals(redis.expire(KEY_PREFIX + token, TTL))) {
            throw new IllegalArgumentException("Phiên đăng ký đã hết hạn");
        }
        LocalDateTime expiresAt = LocalDateTime.now(applicationClock).plus(TTL);
        return expiresAt;
    }

    @Override
    public void replaceUpload(String token, int index, PartnerRegistrationPrecheckResponse.Upload upload) {
        Draft draft = find(token).orElseThrow(() -> new IllegalArgumentException("Phiên đăng ký đã hết hạn"));
        var uploads = new java.util.ArrayList<>(draft.uploads());
        uploads.set(index, upload);
        write(token, new Draft(draft.registration(), draft.verificationToken(), draft.documents(),
                draft.businessVerification(), uploads, LocalDateTime.now(applicationClock).plus(TTL)));
    }

    private void write(String token, Draft draft) {
        try {
            redis.opsForValue().set(KEY_PREFIX + token, objectMapper.writeValueAsString(draft), TTL);
        } catch (Exception ex) {
            throw new IllegalStateException("Không thể cập nhật phiên đăng ký", ex);
        }
    }

    @Override
    public String claim(String token) {
        String claimId = java.util.UUID.randomUUID().toString();
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(
                KEY_PREFIX + "processing:" + token, claimId, Duration.ofMinutes(2))) ? claimId : null;
    }

    @Override
    public void releaseClaim(String token, String claimId) {
        var script = new org.springframework.data.redis.core.script.DefaultRedisScript<Long>(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                Long.class);
        redis.execute(script, java.util.List.of(KEY_PREFIX + "processing:" + token), claimId);
    }

    @Override
    public void delete(String token) {
        redis.delete(KEY_PREFIX + token);
    }
}
