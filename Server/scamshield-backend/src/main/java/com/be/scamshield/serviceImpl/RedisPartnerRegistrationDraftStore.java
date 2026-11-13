package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.PartnerDocumentUploadRequest;
import com.be.scamshield.dto.request.RegisterPartnerRequest;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerRegistrationPrecheckResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.UnaryOperator;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
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
        return update(token, draft -> new Draft(draft.registration(), draft.verificationToken(),
                draft.documents(), draft.businessVerification(), draft.uploads(),
                LocalDateTime.now(applicationClock).plus(TTL))).expiresAt();
    }

    @Override
    public void replaceUpload(String token, int index, PartnerRegistrationPrecheckResponse.Upload upload) {
        update(token, draft -> {
            if (index < 0 || index >= draft.uploads().size()) {
                throw new IllegalArgumentException("Tài liệu không hợp lệ");
            }
            var uploads = new ArrayList<>(draft.uploads());
            uploads.set(index, upload);
            return new Draft(draft.registration(), draft.verificationToken(), draft.documents(),
                    draft.businessVerification(), uploads, LocalDateTime.now(applicationClock).plus(TTL));
        });
    }

    private Draft update(String token, UnaryOperator<Draft> change) {
        byte[] key = (KEY_PREFIX + token).getBytes(StandardCharsets.UTF_8);
        for (int attempt = 0; attempt < 10; attempt++) {
            Draft updated = redis.execute((RedisCallback<Draft>) connection -> {
                connection.watch(key);
                boolean inTransaction = false;
                try {
                    byte[] raw = connection.stringCommands().get(key);
                    if (raw == null) throw new IllegalArgumentException("Phiên đăng ký đã hết hạn");
                    Draft draft = objectMapper.readValue(raw, Draft.class);
                    Draft next = change.apply(draft);
                    connection.multi();
                    inTransaction = true;
                    connection.stringCommands().setEx(key, TTL.toSeconds(), objectMapper.writeValueAsBytes(next));
                    List<Object> result = connection.exec();
                    inTransaction = false;
                    return result == null ? null : next;
                } catch (RuntimeException ex) {
                    if (inTransaction) connection.discard();
                    throw ex;
                } finally {
                    if (!inTransaction) connection.unwatch();
                }
            });
            if (updated != null) return updated;
        }
        throw new IllegalStateException("Phiên đăng ký đang được cập nhật; vui lòng thử lại");
    }

    @Override
    public String claim(String token) {
        String claimId = UUID.randomUUID().toString();
        return Boolean.TRUE.equals(redis.opsForValue().setIfAbsent(
                KEY_PREFIX + "processing:" + token, claimId, Duration.ofMinutes(2))) ? claimId : null;
    }

    @Override
    public void releaseClaim(String token, String claimId) {
        var script = new DefaultRedisScript<Long>(
                "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
                Long.class);
        redis.execute(script, List.of(KEY_PREFIX + "processing:" + token), claimId);
    }

    @Override
    public void delete(String token) {
        redis.delete(KEY_PREFIX + token);
    }
}
