package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.entity.CheckVerdict;
import com.be.scamshield.entity.CheckVerdictReason;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.external.ScamCheckAiClient;
import com.be.scamshield.repository.ConfirmedIndicatorRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScamCheckDecisionService {
    private final IndicatorRepository indicatorRepository;
    private final ConfirmedIndicatorRepository confirmedIndicators;
    private final WhitelistEntryRepository whitelistEntries;
    private final ScamCheckAiClient aiClient;

    public record Decision(CheckVerdict verdict, List<Indicator> knownIndicators) { }

    public Decision decide(CheckRequest check, List<ScamCheckInputProcessor.Candidate> candidates) {
        Map<Long, Indicator> known = new LinkedHashMap<>();
        for (var candidate : candidates) {
            indicatorRepository.findByTypeAndNormalizedValueInOrderByIdAsc(candidate.type(), candidate.aliases())
                    .forEach(indicator -> known.putIfAbsent(indicator.getId(), indicator));
        }
        log.info("Scam check catalog lookup: checkId={}, candidateCount={}, knownIndicatorCount={}",
                check.getId(), candidates.size(), known.size());
        CheckVerdict verdict = CheckVerdict.builder().checkRequest(check).createdAt(check.getCreatedAt()).build();
        if (!known.isEmpty()) {
            var blacklist = confirmedIndicators.findActiveForCheck(known.keySet(), check.getCreatedAt());
            if (!blacklist.isEmpty()) {
                var match = blacklist.getFirst();
                verdict.setVerdict("SCAM_RISK");
                verdict.setDecidedByStage("BLACKLIST");
                verdict.setMatchedIndicator(match.getIndicator());
                verdict.setPrimaryCategory(match.getCategory());
                verdict.setExplanation("Nội dung có chỉ số đã được xác nhận trong danh sách cảnh báo lừa đảo."
                        + (match.getPublicReason() == null ? "" : " " + match.getPublicReason()));
                verdict.setSafetyGuidance("Dừng tương tác, không chuyển tiền và không cung cấp mật khẩu hoặc OTP. "
                        + "Xác minh lại qua kênh chính thức của tổ chức liên quan.");
                addReason(verdict, "CONFIRMED_INDICATOR_MATCH");
                log.info("Scam check blacklist match: checkId={}, indicatorId={}, matchCount={}",
                        check.getId(), match.getIndicator().getId(), blacklist.size());
                return new Decision(verdict, List.copyOf(known.values()));
            }
            // A trusted identifier inside a message cannot establish that the entire message is legitimate.
            if (List.of("PHONE", "URL", "DOMAIN", "BANK_ACCOUNT").contains(check.getInputType())) {
                var whitelist = whitelistEntries.findVerifiedForCheck(known.keySet(),
                        PartnerVerificationStatus.VERIFIED, check.getCreatedAt());
                if (!whitelist.isEmpty()) {
                    verdict.setVerdict("LOW_RISK");
                    verdict.setDecidedByStage("WHITELIST");
                    verdict.setMatchedIndicator(whitelist.getFirst().getIndicator());
                    verdict.setExplanation("Chỉ số khớp với thông tin chính thức đã được xác minh của đối tác.");
                    verdict.setSafetyGuidance("Kết quả xác minh chỉ áp dụng cho chỉ số này. "
                            + "Không chia sẻ mật khẩu hoặc OTP; kiểm tra kỹ yêu cầu chuyển tiền và nội dung liên quan.");
                    addReason(verdict, "VERIFIED_INDICATOR_MATCH");
                    log.info("Scam check whitelist match: checkId={}, indicatorId={}, matchCount={}",
                            check.getId(), whitelist.getFirst().getIndicator().getId(), whitelist.size());
                    return new Decision(verdict, List.copyOf(known.values()));
                }
            }
        }
        if (!List.of("MESSAGE", "URL").contains(check.getInputType())) {
            verdict.setVerdict("UNKNOWN");
            verdict.setDecidedByStage("NONE");
            verdict.setUnknownReason("NO_DECISIVE_CURATED_MATCH");
            verdict.setExplanation("Chưa có thông tin xác minh cho chỉ số này.");
            verdict.setSafetyGuidance("Xác minh số điện thoại hoặc tài khoản qua kênh chính thức trước khi chuyển tiền hay cung cấp thông tin cá nhân.");
            addReason(verdict, "NO_DECISIVE_CURATED_MATCH");
            return new Decision(verdict, List.copyOf(known.values()));
        }
        log.info("Scam check routed to AI: checkId={}, inputType={}, reason=NO_DECISIVE_CURATED_MATCH",
                check.getId(), check.getInputType());
        var result = aiClient.scan(check.getId(), check.getInputType(), check.getRawInput());
        verdict.setVerdict(result.verdict());
        verdict.setDecidedByStage(result.stage());
        verdict.setConfidence(result.confidence());
        verdict.setUnknownReason(result.unknownReason());
        verdict.setExplanation(result.summary());
        verdict.setSafetyGuidance(result.guidance());
        if (result.aiDetails() != null) {
            verdict.setRiskScore(result.aiDetails().verdict().riskScore());
            verdict.setAiSnapshot(new ObjectMapper().writeValueAsString(result.aiDetails()));
        }
        addReason(verdict, result.unknownReason() == null ? "AI_VERDICT" : result.unknownReason());
        if (result.scanId() != null) {
            verdict.getReasons().add(CheckVerdictReason.builder().verdict(verdict)
                    .reasonCode("AI_SCAN_ID").sourceStage(result.stage()).detail(result.scanId()).build());
        }
        return new Decision(verdict, List.copyOf(known.values()));
    }

    private void addReason(CheckVerdict verdict, String code) {
        verdict.getReasons().add(CheckVerdictReason.builder().verdict(verdict)
                .reasonCode(code).sourceStage(verdict.getDecidedByStage()).build());
    }
}
