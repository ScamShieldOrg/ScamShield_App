package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.dto.response.ScamCheckResponse;
import com.be.scamshield.dto.response.UserScamCheckQuotaResponse;
import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.entity.CheckVerdict;
import com.be.scamshield.entity.ExtractedIoc;
import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.repository.CheckRequestRepository;
import com.be.scamshield.repository.CheckVerdictRepository;
import com.be.scamshield.repository.ExtractedIocRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IGuestSessionService;
import com.be.scamshield.service.IScamCheckService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;
import com.be.scamshield.dto.response.ScamCheckAiDetails;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.concurrent.atomic.AtomicReference;

@Service
@Slf4j
public class ScamCheckServiceImpl implements IScamCheckService {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private final CheckRequestRepository checks;
    private final CheckVerdictRepository verdicts;
    private final ExtractedIocRepository extractedIocs;
    private final UserRepository users;
    private final IGuestSessionService guestSessions;
    private final ScamCheckInputProcessor inputProcessor;
    private final ScamCheckDecisionService decisions;
    private final ScamCheckQuotaService quotas;
    private final Clock applicationClock;
    private final TransactionTemplate transactions;

    public ScamCheckServiceImpl(CheckRequestRepository checks, CheckVerdictRepository verdicts,
                                ExtractedIocRepository extractedIocs, UserRepository users,
                                IGuestSessionService guestSessions, ScamCheckInputProcessor inputProcessor,
                                ScamCheckDecisionService decisions, ScamCheckQuotaService quotas,
                                Clock applicationClock, PlatformTransactionManager transactionManager) {
        this.checks = checks;
        this.verdicts = verdicts;
        this.extractedIocs = extractedIocs;
        this.users = users;
        this.guestSessions = guestSessions;
        this.inputProcessor = inputProcessor;
        this.decisions = decisions;
        this.quotas = quotas;
        this.applicationClock = applicationClock;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    @Value("${app.scam-check.retention-days:30}")
    private int retentionDays;

    @Override
    public ScamCheckResponse check(ScamCheckRequest request, Long userId, String guestToken) {
        long started = System.nanoTime();
        log.info("Scam check submission received: ownerType={}", userId == null ? "GUEST" : "USER");
        Owner owner = owner(userId, guestToken);
        var input = inputProcessor.prepare(request);
        log.debug("Scam check input prepared: inputType={}, candidateCount={}",
                request.getInputType(), input.candidates().size());
        if (retentionDays < 1) throw new IllegalStateException("Scam-check retention-days must be positive");
        AtomicReference<String> reservation = new AtomicReference<>();
        CheckRequest check;
        try {
            check = transactions.execute(status -> {
                reservation.set(quotas.reserve(owner.user(), owner.guest()));
                LocalDateTime now = now();
                return checks.save(CheckRequest.builder().user(owner.user()).guestSession(owner.guest())
                        .inputType(request.getInputType()).rawInput(request.getContent())
                        .normalizedInput(input.normalized()).maskedInput(input.masked()).inputHash(input.hash())
                        .status("PROCESSING").createdAt(now).retentionExpiresAt(now.plusDays(retentionDays)).build());
            });
        } catch (RuntimeException ex) {
            releaseReservation(reservation.get());
            throw ex;
        }
        log.info("Scam check created: checkId={}, inputType={}, ownerType={}, candidateCount={}",
                check.getId(), check.getInputType(), userId == null ? "GUEST" : "USER", input.candidates().size());
        CheckVerdict saved;
        try {
            var decision = decisions.decide(check, input.candidates());
            saved = transactions.execute(status -> {
                LocalDateTime now = now();
                CheckRequest managedCheck = checks.findById(check.getId()).orElseThrow(this::notFound);
                // Link known catalog indicators; checking unverified text must not populate the curated catalog.
                for (var indicator : decision.knownIndicators()) {
                    var candidate = input.candidates().stream().filter(c -> c.type().equals(indicator.getType())
                            && c.aliases().contains(indicator.getNormalizedValue())).findFirst().orElseThrow();
                    extractedIocs.save(ExtractedIoc.builder().checkRequest(managedCheck).indicator(indicator)
                            .extractionMethod("REGEX").startPosition(candidate.start()).endPosition(candidate.end())
                            .createdAt(now).build());
                }
                managedCheck.setStatus("COMPLETED");
                managedCheck.setCompletedAt(now);
                decision.verdict().setCheckRequest(managedCheck);
                return verdicts.saveAndFlush(decision.verdict());
            });
        } catch (RuntimeException ex) {
            releaseReservation(reservation.get());
            throw ex;
        }
        log.info("Scam check result persisted: checkId={}, verdictId={}, verdict={}, stage={}, unknownReason={}, elapsedMs={}",
                check.getId(), saved.getId(), saved.getVerdict(), saved.getDecidedByStage(),
                saved.getUnknownReason(), (System.nanoTime() - started) / 1_000_000);
        return response(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public ScamCheckResponse getResult(Long checkId, Long userId, String guestToken) {
        log.debug("Scam check result requested: checkId={}, ownerType={}", checkId, userId == null ? "GUEST" : "USER");
        Owner owner = owner(userId, guestToken);
        CheckRequest check = checks.findById(checkId).orElseThrow(this::notFound);
        boolean owned = owner.user() != null
                ? check.getUser() != null && owner.user().getId().equals(check.getUser().getId())
                : check.getGuestSession() != null && owner.guest().getId().equals(check.getGuestSession().getId());
        if (!owned || "DELETED".equals(check.getStatus())
                || (check.getRetentionExpiresAt() != null && !check.getRetentionExpiresAt().isAfter(now()))) {
            log.debug("Scam check result unavailable: checkId={}, owned={}, status={}", checkId, owned, check.getStatus());
            throw notFound();
        }
        return response(verdicts.findByCheckRequestId(checkId).orElseThrow(this::notFound));
    }

    @Override
    @Transactional(readOnly = true)
    public UserScamCheckQuotaResponse getUserQuota(Long userId) {
        if (userId == null) throw new UnauthorizedException("Vui lòng đăng nhập để xem hạn mức");
        return quotas.getUserQuota(owner(userId, null).user());
    }

    private Owner owner(Long userId, String guestToken) {
        if (userId == null) return new Owner(null, guestSessions.getValidSession(guestToken));
        User user = users.findById(userId).orElseThrow(() -> new UnauthorizedException("Phiên đăng nhập không hợp lệ"));
        if (!"ACTIVE".equals(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Tài khoản chưa hoạt động hoặc đã bị khóa");
        }
        return new Owner(user, null);
    }

    private ScamCheckResponse response(CheckVerdict verdict) {
        var check = verdict.getCheckRequest();
        var indicator = verdict.getMatchedIndicator();
        return new ScamCheckResponse(check.getId(), verdict.getId(), check.getInputType(), check.getStatus(),
                verdict.getVerdict(), verdict.getDecidedByStage(),
                verdict.getPrimaryCategory() == null ? null : verdict.getPrimaryCategory().getCode(),
                verdict.getConfidence(), verdict.getExplanation(), verdict.getSafetyGuidance(), verdict.getUnknownReason(),
                indicator == null ? null : new ScamCheckResponse.MatchedIndicator(
                        indicator.getId(), indicator.getType(), indicator.getNormalizedValue()),
                verdict.getReasons().stream().map(r -> new ScamCheckResponse.Reason(
                        r.getReasonCode(), r.getSourceStage(), r.getDetail())).toList(),
                check.getCreatedAt(), check.getCompletedAt(), check.getRetentionExpiresAt(),
                verdict.getAiSnapshot() == null ? null : new ObjectMapper().readValue(verdict.getAiSnapshot(), ScamCheckAiDetails.class));
    }

    private LocalDateTime now() {
        return LocalDateTime.now(applicationClock.withZone(VIETNAM));
    }

    private void releaseReservation(String reservation) {
        if (reservation != null) quotas.releaseReservation(reservation);
    }

    private ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy kết quả kiểm tra");
    }

    private record Owner(User user, GuestSession guest) { }
}
