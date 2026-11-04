package com.be.scamshield.serviceImpl;

import com.be.scamshield.repository.CheckRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScamCheckRetentionService {
    private final CheckRequestRepository checks;
    private final Clock applicationClock;

    @Scheduled(cron = "${app.scam-check.retention-cleanup-cron:0 0 1 * * *}", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void redactExpiredInputs() {
        int redacted = checks.redactExpiredInputs(LocalDateTime.now(applicationClock.withZone(ZoneId.of("Asia/Ho_Chi_Minh"))));
        if (redacted > 0) log.info("Redacted input text and hashes for {} expired scam checks", redacted);
    }
}
