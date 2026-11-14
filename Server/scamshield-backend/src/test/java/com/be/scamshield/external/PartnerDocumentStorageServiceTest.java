package com.be.scamshield.external;

import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.serviceImpl.PartnerRegistrationDraftStore;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PartnerDocumentStorageServiceTest {
    @Test
    void blankEndpointUsesTheSharedFactoryForUploadAndCleanup() {
        var clients = mock(SupabaseStorageClientFactory.class);
        var s3 = mock(S3Client.class);
        when(clients.createClient("ap-south-1", "access", "secret", "")).thenReturn(s3);
        when(s3.listObjectsV2(any(ListObjectsV2Request.class)))
                .thenReturn(ListObjectsV2Response.builder().contents(List.of()).isTruncated(false).build());
        var service = new PartnerDocumentStorageService(clients,
                mock(PartnerDocumentRepository.class), mock(PartnerRegistrationDraftStore.class));
        ReflectionTestUtils.setField(service, "region", "ap-south-1");
        ReflectionTestUtils.setField(service, "accessKeyId", "access");
        ReflectionTestUtils.setField(service, "secretAccessKey", "secret");
        ReflectionTestUtils.setField(service, "endpoint", "");
        ReflectionTestUtils.setField(service, "bucket", "partner-documents");

        assertThat(service.uploadPendingBytes("draft", "license.pdf", "application/pdf", new byte[]{1}))
                .startsWith("pending/draft/");
        service.cleanupExpiredPendingObjects();

        verify(s3).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        verify(s3).listObjectsV2(any(ListObjectsV2Request.class));
    }
}
