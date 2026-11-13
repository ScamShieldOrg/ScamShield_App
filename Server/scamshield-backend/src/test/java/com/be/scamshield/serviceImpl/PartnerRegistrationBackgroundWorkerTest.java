package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.external.PartnerDocumentStorageService;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.s3.model.S3Exception;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartnerRegistrationBackgroundWorkerTest {
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-13T09:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh"));
    @Mock PartnerDocumentRepository documents;
    @Mock PartnerProfileRepository profiles;
    @Mock PartnerDocumentStorageService storage;
    @Mock PartnerBusinessVerificationService verification;

    @Test
    void movesPendingFileAfterCommitAndMarksItReady() {
        var file = PartnerDocument.builder().id(7L).partner(PartnerProfile.builder().id(12L).build())
                .storageObjectKey("pending/draft/file.pdf").storageStatus("MOVING").storageEtag("etag").build();
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L)).thenReturn(List.of(file));
        when(storage.copyPending("pending/draft/file.pdf", 12L, 7L, "etag"))
                .thenReturn("documents/12/7.pdf");

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper(), clock)
                .prepareDocuments();

        assertThat(file.getStorageStatus()).isEqualTo("READY");
        assertThat(file.getStorageObjectKey()).isEqualTo("documents/12/7.pdf");
        verify(documents).save(file);
        verify(storage).deletePending("pending/draft/file.pdf");
    }

    @Test
    void failedCopyLeavesFileRetryable() {
        var file = PartnerDocument.builder().id(7L).partner(PartnerProfile.builder().id(12L).build())
                .storageObjectKey("pending/draft/file.pdf").storageStatus("MOVING").build();
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L)).thenReturn(List.of(file));
        when(storage.copyPending(any(), any(), any(), any())).thenThrow(new IllegalStateException("storage unavailable"));

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper(), clock)
                .prepareDocuments();

        assertThat(file.getStorageStatus()).isEqualTo("MOVING");
        verify(documents, never()).save(any());
        verify(storage, never()).deletePending(any());
    }

    @Test
    void failedPendingCleanupDoesNotUndoPromotedDocument() {
        var file = PartnerDocument.builder().id(7L).partner(PartnerProfile.builder().id(12L).build())
                .storageObjectKey("pending/draft/file.pdf").storageStatus("MOVING")
                .createdAt(LocalDateTime.now(clock).minusHours(2)).build();
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L)).thenReturn(List.of(file));
        when(storage.copyPending("pending/draft/file.pdf", 12L, 7L, null))
                .thenReturn("documents/12/7.pdf");
        doThrow(new IllegalStateException("cleanup unavailable")).when(storage).deletePending("pending/draft/file.pdf");

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper(), clock)
                .prepareDocuments();

        assertThat(file.getStorageStatus()).isEqualTo("READY");
        assertThat(file.getStorageObjectKey()).isEqualTo("documents/12/7.pdf");
        verifyNoInteractions(profiles);
    }

    @Test
    void changedUploadIsFlaggedWithoutDeletingTheSource() {
        var profile = PartnerProfile.builder().id(12L).documentVerificationStatus("PENDING_OCR").build();
        var file = PartnerDocument.builder().id(7L).partner(profile)
                .storageObjectKey("pending/draft/file.pdf").storageStatus("MOVING").storageEtag("inspected-etag")
                .createdAt(LocalDateTime.now(clock)).build();
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L)).thenReturn(List.of(file));
        when(storage.copyPending("pending/draft/file.pdf", 12L, 7L, "inspected-etag"))
                .thenThrow(S3Exception.builder().statusCode(412).message("Precondition Failed").build());
        when(profiles.findById(12L)).thenReturn(Optional.of(profile));

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper(), clock)
                .prepareDocuments();

        assertThat(file.getStorageStatus()).isEqualTo("FAILED");
        assertThat(file.getStorageObjectKey()).isEqualTo("pending/draft/file.pdf");
        assertThat(profile.getDocumentVerificationStatus()).isEqualTo("FLAGGED");
        verify(documents).save(file);
        verify(profiles).save(profile);
        verify(storage, never()).deletePending(any());
    }

    @Test
    void staleFailedCopyLeavesQueueSoNewerDocumentCanMove() {
        var profile = PartnerProfile.builder().id(12L).documentVerificationStatus("PENDING_OCR").build();
        var stale = PartnerDocument.builder().id(7L).partner(profile)
                .storageObjectKey("pending/draft/stale.pdf").storageStatus("MOVING")
                .createdAt(LocalDateTime.now(clock).minusHours(2)).build();
        var newer = PartnerDocument.builder().id(8L).partner(PartnerProfile.builder().id(13L).build())
                .storageObjectKey("pending/draft/new.pdf").storageStatus("MOVING")
                .createdAt(LocalDateTime.now(clock)).build();
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L)).thenReturn(List.of(stale, newer));
        when(storage.copyPending("pending/draft/stale.pdf", 12L, 7L, null))
                .thenThrow(new IllegalStateException("storage unavailable"));
        when(storage.copyPending("pending/draft/new.pdf", 13L, 8L, null))
                .thenReturn("documents/13/8.pdf");
        when(profiles.findById(12L)).thenReturn(Optional.of(profile));

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper(), clock)
                .prepareDocuments();

        assertThat(stale.getStorageStatus()).isEqualTo("FAILED");
        assertThat(newer.getStorageStatus()).isEqualTo("READY");
        assertThat(newer.getStorageObjectKey()).isEqualTo("documents/13/8.pdf");
        verify(storage, never()).deletePending("pending/draft/stale.pdf");
        verify(storage).deletePending("pending/draft/new.pdf");
    }

    @Test
    void retriesOldBatchThenAdvancesToNewerDocuments() {
        var old = PartnerDocument.builder().id(7L).partner(PartnerProfile.builder().id(12L).build())
                .storageObjectKey("pending/draft/old.pdf").storageStatus("MOVING")
                .createdAt(LocalDateTime.now(clock)).build();
        var newer = PartnerDocument.builder().id(8L).partner(PartnerProfile.builder().id(13L).build())
                .storageObjectKey("pending/draft/new.pdf").storageStatus("MOVING")
                .createdAt(LocalDateTime.now(clock)).build();
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 0L))
                .thenReturn(List.of(old));
        when(documents.findTop50ByStorageStatusAndIdGreaterThanOrderByIdAsc("MOVING", 7L))
                .thenReturn(List.of(newer));
        when(storage.copyPending("pending/draft/old.pdf", 12L, 7L, null))
                .thenThrow(new IllegalStateException("temporary outage"));
        when(storage.copyPending("pending/draft/new.pdf", 13L, 8L, null))
                .thenReturn("documents/13/8.pdf");
        var worker = new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification,
                new ObjectMapper(), clock);

        worker.prepareDocuments();
        worker.prepareDocuments();

        assertThat(old.getStorageStatus()).isEqualTo("MOVING");
        assertThat(newer.getStorageStatus()).isEqualTo("READY");
    }

    @Test
    void failedDocumentCannotHoldTheOcrQueue() {
        var profile = PartnerProfile.builder().id(12L).documentVerificationStatus("PENDING_OCR").build();
        when(profiles.findTop20ByDocumentVerificationStatusOrderByCreatedAtAsc("PENDING_OCR"))
                .thenReturn(List.of(profile));
        when(documents.existsByPartnerIdAndStorageStatus(12L, "FAILED")).thenReturn(true);

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper(), clock)
                .verifyReadyProfiles();

        assertThat(profile.getDocumentVerificationStatus()).isEqualTo("FLAGGED");
        verify(profiles).save(profile);
        verifyNoInteractions(storage, verification);
    }
}
