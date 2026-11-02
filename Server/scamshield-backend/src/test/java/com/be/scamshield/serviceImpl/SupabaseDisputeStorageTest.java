package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.SupabaseStorageService;

import com.be.scamshield.exception.DisputeStorageException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import software.amazon.awssdk.awscore.exception.AwsErrorDetails;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Map;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.RETURNS_SELF;
import static org.mockito.ArgumentMatchers.any;

class SupabaseDisputeStorageTest {

    private static final String FAKE_ACCESS_KEY = "OFFLINE_TEST_ACCESS_KEY";
    private static final String FAKE_SECRET_KEY = "offline-test-secret-never-used-on-network";
    private SupabaseStorageService storage;

    @BeforeEach
    void setUp() {
        storage = new SupabaseStorageService();
        ReflectionTestUtils.setField(storage, "region", "ap-south-1");
        ReflectionTestUtils.setField(storage, "accessKeyId", FAKE_ACCESS_KEY);
        ReflectionTestUtils.setField(storage, "secretAccessKey", FAKE_SECRET_KEY);
        ReflectionTestUtils.setField(storage, "endpointOverride", "https://storage.example.test/storage/v1/s3");
        ReflectionTestUtils.setField(storage, "disputeBucketName", "private-dispute-evidences");
        ReflectionTestUtils.setField(storage, "disputeUrlExpirationSeconds", 900L);
    }

    @Test
    void missingBucketReturnsActionableMessageWithoutExposingCredentials() {
        S3ClientBuilder builder = mock(S3ClientBuilder.class, RETURNS_SELF);
        S3Client client = mock(S3Client.class);
        when(builder.build()).thenReturn(client);
        when(client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenThrow(S3Exception.builder().statusCode(404).requestId("offline-test")
                        .awsErrorDetails(AwsErrorDetails.builder().errorCode("NoSuchBucket").build()).build());
        try (var mockedS3 = mockStatic(S3Client.class)) {
            mockedS3.when(S3Client::builder).thenReturn(builder);
            MockMultipartFile file = new MockMultipartFile("files", "proof.pdf", "application/pdf", "%PDF-1.7".getBytes(StandardCharsets.US_ASCII));
            assertThatThrownBy(() -> storage.uploadDisputeFile(file))
                    .isInstanceOf(DisputeStorageException.class)
                    .hasMessageContaining("Không tìm thấy bucket")
                    .hasMessageContaining("SUPABASE_DISPUTE_BUCKET_NAME")
                    .hasMessageNotContaining(FAKE_ACCESS_KEY)
                    .hasMessageNotContaining(FAKE_SECRET_KEY);
        }
    }

    @Test
    void createsPathStylePrivateDownloadUrlSignedForGetWithConfiguredExpiration() throws Exception {
        String downloadUrl = storage.createDisputeDownloadUrl("disputes/offline-proof.pdf");
        URI uri = URI.create(downloadUrl);
        Map<String, String> query = queryParameters(uri);

        assertThat(uri.getHost()).isEqualTo("storage.example.test");
        assertThat(uri.getPath()).isEqualTo("/storage/v1/s3/private-dispute-evidences/disputes/offline-proof.pdf");
        assertThat(query).containsEntry("X-Amz-Expires", "900")
                .containsEntry("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
                .containsEntry("X-Amz-SignedHeaders", "host");
        assertThat(query.get("X-Amz-Credential")).startsWith(FAKE_ACCESS_KEY + "/");
        assertThat(query.get("X-Amz-Signature")).isEqualTo(signatureForMethod(uri, query, "GET"))
                .isNotEqualTo(signatureForMethod(uri, query, "PUT"));
        assertThat(downloadUrl).doesNotContain("/object/public/", FAKE_SECRET_KEY);
    }

    @Test
    void usesConfiguredDownloadExpirationInsteadOfFixedDefault() {
        ReflectionTestUtils.setField(storage, "disputeUrlExpirationSeconds", 120L);
        URI uri = URI.create(storage.createDisputeDownloadUrl("disputes/offline-proof.pdf"));
        assertThat(queryParameters(uri)).containsEntry("X-Amz-Expires", "120");
    }

    @ParameterizedTest
    @ValueSource(longs = {0, -1, 604801})
    void rejectsInvalidExpirationWithSafeStorageError(long expirationSeconds) {
        ReflectionTestUtils.setField(storage, "disputeUrlExpirationSeconds", expirationSeconds);
        assertThatThrownBy(() -> storage.createDisputeDownloadUrl("disputes/offline-proof.pdf"))
                .isInstanceOf(DisputeStorageException.class)
                .hasMessageContaining("Thời hạn")
                .hasMessageNotContaining(FAKE_ACCESS_KEY)
                .hasMessageNotContaining(FAKE_SECRET_KEY);
    }

    @Test
    void missingPrivateBucketFailsBeforeAnyStorageOperation() {
        ReflectionTestUtils.setField(storage, "disputeBucketName", " ");
        MockMultipartFile file = new MockMultipartFile("files", "proof.pdf", "application/pdf", new byte[]{1});
        assertThatThrownBy(() -> storage.uploadDisputeFile(file))
                .isInstanceOf(DisputeStorageException.class).hasMessageContaining("chưa được cấu hình");
        assertThatThrownBy(() -> storage.createDisputeDownloadUrl("disputes/offline-proof.pdf"))
                .isInstanceOf(DisputeStorageException.class).hasMessageContaining("chưa được cấu hình");
        assertThatThrownBy(() -> storage.deleteDisputeFile("disputes/offline-proof.pdf"))
                .isInstanceOf(DisputeStorageException.class).hasMessageContaining("chưa được cấu hình");
    }

    @Test
    void signingErrorsDoNotExposeProviderConfiguration() {
        ReflectionTestUtils.setField(storage, "endpointOverride", "not a valid URI with " + FAKE_SECRET_KEY);
        assertThatThrownBy(() -> storage.createDisputeDownloadUrl("disputes/offline-proof.pdf"))
                .isInstanceOf(DisputeStorageException.class)
                .hasMessageContaining("Không thể tạo liên kết")
                .hasMessageNotContaining(FAKE_ACCESS_KEY)
                .hasMessageNotContaining(FAKE_SECRET_KEY);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "evidences/other-private-file.pdf"})
    void rejectsKeysOutsideDisputeFolder(String objectKey) {
        assertThatThrownBy(() -> storage.createDisputeDownloadUrl(objectKey))
                .isInstanceOf(DisputeStorageException.class).hasMessageContaining("không hợp lệ");
    }

    @Test
    void standardAwsS3ConfiguredWithoutEndpointOverride() {
        ReflectionTestUtils.setField(storage, "endpointOverride", "");
        assertThat(storage.isStorageConfigured()).isTrue();
        assertThat(storage.isAwsConfigured()).isTrue();

        String downloadUrl = storage.createDisputeDownloadUrl("disputes/proof.pdf");
        assertThat(downloadUrl).startsWith("https://");
        assertThat(downloadUrl).contains("private-dispute-evidences");
        assertThat(downloadUrl).contains("X-Amz-Signature");
    }

    @Test
    void disputeBucketDefaultsToGeneralS3BucketWhenNotSeparatelyConfigured() {
        ReflectionTestUtils.setField(storage, "disputeBucketName", null);
        ReflectionTestUtils.setField(storage, "bucketName", "evidences");
        assertThat(storage.getDisputeBucketName()).isEqualTo("evidences");
    }

    private Map<String, String> queryParameters(URI uri) {
        return Arrays.stream(uri.getRawQuery().split("&"))
                .map(parameter -> parameter.split("=", 2))
                .collect(Collectors.toMap(parameter -> URLDecoder.decode(parameter[0], StandardCharsets.UTF_8),
                        parameter -> URLDecoder.decode(parameter[1], StandardCharsets.UTF_8)));
    }

    private String signatureForMethod(URI uri, Map<String, String> query, String method) throws Exception {
        String canonicalQuery = Arrays.stream(uri.getRawQuery().split("&"))
                .filter(parameter -> !parameter.startsWith("X-Amz-Signature="))
                .sorted().collect(Collectors.joining("&"));
        String canonicalRequest = method + "\n" + uri.getRawPath() + "\n" + canonicalQuery
                + "\nhost:" + uri.getRawAuthority() + "\n\nhost\nUNSIGNED-PAYLOAD";
        String scope = query.get("X-Amz-Credential").substring(FAKE_ACCESS_KEY.length() + 1);
        String stringToSign = "AWS4-HMAC-SHA256\n" + query.get("X-Amz-Date") + "\n" + scope + "\n"
                + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(canonicalRequest.getBytes(StandardCharsets.UTF_8)));
        byte[] signingKey = ("AWS4" + FAKE_SECRET_KEY).getBytes(StandardCharsets.UTF_8);
        for (String part : scope.split("/")) {
            signingKey = hmac(signingKey, part);
        }
        return HexFormat.of().formatHex(hmac(signingKey, stringToSign));
    }

    private byte[] hmac(byte[] key, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
}
