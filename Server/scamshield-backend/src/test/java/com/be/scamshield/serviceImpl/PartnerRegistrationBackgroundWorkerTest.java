package com.be.scamshield.serviceImpl;

import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.external.PartnerDocumentStorageService;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PartnerRegistrationBackgroundWorkerTest {
    @Mock PartnerDocumentRepository documents;
    @Mock PartnerProfileRepository profiles;
    @Mock PartnerDocumentStorageService storage;
    @Mock PartnerBusinessVerificationService verification;

    @Test
    void movesPendingFileAfterCommitAndMarksItReady() {
        var file = PartnerDocument.builder().id(7L).partner(PartnerProfile.builder().id(12L).build())
                .storageObjectKey("pending/draft/file.pdf").storageStatus("MOVING").storageEtag("etag").build();
        when(documents.findTop50ByStorageStatusOrderByIdAsc("MOVING")).thenReturn(List.of(file));
        when(storage.copyPending("pending/draft/file.pdf", 12L, 7L, "etag"))
                .thenReturn("documents/12/7.pdf");

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper())
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
        when(documents.findTop50ByStorageStatusOrderByIdAsc("MOVING")).thenReturn(List.of(file));
        when(storage.copyPending(any(), any(), any(), any())).thenThrow(new IllegalStateException("storage unavailable"));

        new PartnerRegistrationBackgroundWorker(documents, profiles, storage, verification, new ObjectMapper())
                .prepareDocuments();

        assertThat(file.getStorageStatus()).isEqualTo("MOVING");
        verify(documents, never()).save(any());
        verify(storage, never()).deletePending(any());
    }
}
