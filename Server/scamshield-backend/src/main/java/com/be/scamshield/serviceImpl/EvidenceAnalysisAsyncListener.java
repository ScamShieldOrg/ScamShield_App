package com.be.scamshield.serviceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionalEventListener;
@Component
@RequiredArgsConstructor
@Slf4j
public class EvidenceAnalysisAsyncListener {
    private final EvidenceAnalysisProcessor processor;
    @Async("evidenceAnalysisExecutor")
    @TransactionalEventListener
    public void analyze(EvidenceAnalysisRequested event) {
        for (int attempt = 0; attempt < 3; attempt++) {
            try {
                if (!processor.process(event.evidenceId())) return;
            } catch (Exception exception) {
                log.warn("Cannot analyze evidence {}", event.evidenceId(), exception);
                return;
            }
            if (Thread.currentThread().isInterrupted()) return;
        }
    }
}
