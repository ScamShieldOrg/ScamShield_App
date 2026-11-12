package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.external.PartnerDocumentStorageService;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
@Slf4j
public class PartnerRegistrationBackgroundWorker {
    private final PartnerDocumentRepository documents;
    private final PartnerProfileRepository profiles;
    private final PartnerDocumentStorageService storage;
    private final PartnerBusinessVerificationService verificationService;
    private final ObjectMapper objectMapper;

    @Scheduled(fixedDelayString = "${PARTNER_REGISTRATION_WORK_INTERVAL_MS:10000}")
    public void prepareDocuments() {
        for (PartnerDocument document : documents.findTop50ByStorageStatusOrderByIdAsc("MOVING")) {
            String pendingKey = document.getStorageObjectKey();
            try {
                String readyKey = storage.copyPending(pendingKey, document.getPartner().getId(), document.getId(),
                        document.getStorageEtag());
                document.setStorageObjectKey(readyKey);
                document.setStorageStatus("READY");
                documents.save(document);
                storage.deletePending(pendingKey);
            } catch (Exception ex) {
                log.warn("Partner document {} remains pending: {}", document.getId(), ex.getMessage());
            }
        }
    }

    @Scheduled(fixedDelayString = "${PARTNER_REGISTRATION_OCR_INTERVAL_MS:15000}")
    public void verifyReadyProfiles() {
        profiles.resetStaleDocumentVerification(java.time.LocalDateTime.now().minusMinutes(5));
        for (var profile : profiles.findTop20ByDocumentVerificationStatusOrderByCreatedAtAsc("PENDING_OCR")) {
            if (documents.existsByPartnerIdAndStorageStatusNot(profile.getId(), "READY")) continue;
            if (profiles.claimDocumentVerification(profile.getId(), java.time.LocalDateTime.now()) != 1) continue;
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
