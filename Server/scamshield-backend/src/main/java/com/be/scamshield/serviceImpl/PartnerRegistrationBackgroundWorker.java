package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.external.PartnerDocumentStorageService;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerRegistrationBackgroundWorker {
    private final PartnerDocumentRepository documents;
    private final PartnerProfileRepository profiles;
    private final PartnerDocumentStorageService storage;
    private final PartnerBusinessVerificationService verificationService;
    private final ObjectMapper objectMapper;
    private final Clock applicationClock;
    private long lastProcessedDocumentId;

    @Scheduled(fixedDelayString = "${PARTNER_REGISTRATION_WORK_INTERVAL_MS:10000}")
    public void prepareDocuments() {
        List<PartnerDocument> batch = documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc(
                "MOVING", lastProcessedDocumentId);
        if (batch.isEmpty() && lastProcessedDocumentId != 0) {
            lastProcessedDocumentId = 0;
            batch = documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L);
        }
        for (PartnerDocument document : batch) {
            lastProcessedDocumentId = document.getId();
            String pendingKey = document.getStorageObjectKey();
            String readyKey;
            try {
                readyKey = storage.copyPending(pendingKey, document.getPartner().getId(), document.getId(),
                        document.getStorageEtag());
            } catch (Exception ex) {
                handleCopyFailure(document, ex);
                continue;
            }
            try {
                document.setStorageObjectKey(readyKey);
                document.setStorageStatus("READY");
                documents.save(document);
            } catch (Exception ex) {
                log.warn("Could not record promoted partner document {}: {}", document.getId(), ex.getMessage());
                continue;
            }
            try {
                storage.deletePending(pendingKey);
            } catch (Exception ex) {
                log.warn("Could not clean up pending partner document {}: {}", document.getId(), ex.getMessage());
            }
        }
    }

    private void handleCopyFailure(PartnerDocument document, Exception ex) {
        if (isPermanentCopyFailure(ex) || document.getCreatedAt() != null
                && !document.getCreatedAt().isAfter(LocalDateTime.now(applicationClock).minusHours(1))) {
            try {
                document.setStorageStatus("FAILED");
                documents.save(document);
                profiles.findById(document.getPartner().getId()).ifPresent(profile -> {
                    if (!"FLAGGED".equals(profile.getDocumentVerificationStatus())) {
                        profile.setDocumentVerificationStatus("FLAGGED");
                        profiles.save(profile);
                    }
                });
                log.warn("Partner document {} cannot be promoted and was flagged: {}", document.getId(), ex.getMessage());
            } catch (Exception updateFailure) {
                log.warn("Could not flag partner document {} after copy failure: {}",
                        document.getId(), updateFailure.getMessage());
            }
        } else {
            log.warn("Partner document {} remains pending: {}", document.getId(), ex.getMessage());
        }
    }

    private boolean isPermanentCopyFailure(Exception ex) {
        for (Throwable cause = ex; cause != null; cause = cause.getCause()) {
            if (cause instanceof S3Exception s3 && (s3.statusCode() == 404 || s3.statusCode() == 412)) {
                return true;
            }
        }
        return false;
    }

    @Scheduled(fixedDelayString = "${PARTNER_REGISTRATION_OCR_INTERVAL_MS:15000}")
    public void verifyReadyProfiles() {
        profiles.resetStaleDocumentVerification(LocalDateTime.now(applicationClock).minusMinutes(5));
        for (var profile : profiles.findTop20ByDocumentVerificationStatusOrderByCreatedAtAsc("PENDING_OCR")) {
            if (documents.existsByPartnerIdAndStorageStatus(profile.getId(), "FAILED")) {
                profile.setDocumentVerificationStatus("FLAGGED");
                profiles.save(profile);
            }
        }
        for (var profile : profiles.findReadyForDocumentVerification(PageRequest.of(0, 20))) {
            if (documents.existsByPartnerIdAndStorageStatusNot(profile.getId(), "READY")) continue;
            if (profiles.claimDocumentVerification(profile.getId(), LocalDateTime.now(applicationClock)) != 1) continue;
            var files = documents.findByPartnerId(profile.getId());
            try {
                for (var file : files) {
                    if ("BUSINESS_LICENSE".equals(file.getDocumentType())) {
                        file.setContent(storage.readStoredDocument(file.getStorageObjectKey(), file.getFileSize()));
                    }
                }
                var precheck = objectMapper.readValue(profile.getBusinessVerificationResult(),
                        PartnerBusinessVerificationResponse.class);
                var result = verificationService.verifyDocuments(profile.getLegalName(), profile.getTaxCode(), files, precheck);
                profiles.completeDocumentVerification(profile.getId(), objectMapper.writeValueAsString(result),
                        result.outcome() == PartnerBusinessVerificationResponse.Outcome.MATCHED ? "PASSED" : "FLAGGED");
            } catch (Exception ex) {
                int attempts = profile.getDocumentVerificationAttempts() == null ? 0 : profile.getDocumentVerificationAttempts();
                profiles.failDocumentVerification(profile.getId(), attempts + 1,
                        attempts + 1 >= 3 ? "FLAGGED" : "PENDING_OCR");
                log.warn("Partner verification {} failed: {}", profile.getId(), ex.getMessage());
            } finally {
                files.forEach(file -> file.setContent(null));
            }
        }
    }
}
