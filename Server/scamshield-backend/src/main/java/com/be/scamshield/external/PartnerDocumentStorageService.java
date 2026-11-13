package com.be.scamshield.external;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.scheduling.annotation.Scheduled;
import lombok.extern.slf4j.Slf4j;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.serviceImpl.PartnerRegistrationDraftStore;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

/** Storage operations scoped to private business-partner registration documents. */
@Service
@Slf4j
public class PartnerDocumentStorageService {
    private static final long UPLOAD_URL_SECONDS = 900;

    private final SupabaseStorageClientFactory clients;
    private final PartnerDocumentRepository documentRepository;
    private final PartnerRegistrationDraftStore drafts;

    @Value("${app.supabase.storage.region:${AWS_REGION:${SUPABASE_STORAGE_REGION:ap-south-1}}}")
    private String region;
    @Value("${app.supabase.storage.access-key-id:${AWS_ACCESS_KEY_ID:${SUPABASE_STORAGE_ACCESS_KEY:}}}")
    private String accessKeyId;
    @Value("${app.supabase.storage.secret-access-key:${AWS_SECRET_ACCESS_KEY:${SUPABASE_STORAGE_SECRET_KEY:}}}")
    private String secretAccessKey;
    @Value("${app.supabase.storage.endpoint-override:${AWS_S3_ENDPOINT_OVERRIDE:${SUPABASE_STORAGE_ENDPOINT:}}}")
    private String endpoint;
    @Value("${app.supabase.storage.partner-document-bucket-name:${SUPABASE_PARTNER_DOCUMENT_BUCKET:partner-documents}}")
    private String bucket;
    @Value("${app.supabase.storage.download-url-expiration-seconds:${PARTNER_DOCUMENT_URL_EXPIRATION_SECONDS:900}}")
    private long downloadUrlExpirationSeconds;

    public PartnerDocumentStorageService(SupabaseStorageClientFactory clients, PartnerDocumentRepository documentRepository,
                                         PartnerRegistrationDraftStore drafts) {
        this.clients = clients;
        this.documentRepository = documentRepository;
        this.drafts = drafts;
    }

    public UploadTarget createUploadTarget(String draftId, String fileName, String contentType) {
        requireConfigured();
        String extension = StringUtils.getFilenameExtension(fileName);
        String key = "pending/" + draftId + "/" + UUID.randomUUID()
                + (StringUtils.hasText(extension) ? "." + extension.toLowerCase() : "");
        var put = PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build();
        try (var presigner = clients.createPresigner(region, accessKeyId, secretAccessKey, endpoint, true)) {
            String url = presigner.presignPutObject(PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofSeconds(UPLOAD_URL_SECONDS))
                    .putObjectRequest(put).build()).url().toString();
            return new UploadTarget(key, enforceHttps(url), UPLOAD_URL_SECONDS);
        }
    }

    public String uploadPendingBytes(String draftId, String fileName, String contentType, byte[] content) {
        requireConfigured();
        String extension = StringUtils.getFilenameExtension(fileName);
        String key = "pending/" + draftId + "/" + UUID.randomUUID()
                + (StringUtils.hasText(extension) ? "." + extension.toLowerCase() : "");
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            client.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                    RequestBody.fromBytes(content));
            return key;
        }
    }

    public byte[] readUploadedDocument(String key, long expectedSize, String expectedContentType) throws IOException {
        requirePendingKey(key);
        if (expectedSize <= 0 || expectedSize > 25L * 1024 * 1024) {
            throw new IllegalArgumentException("Kích thước tài liệu không hợp lệ");
        }
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            var head = client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            if (head.contentLength() == null || head.contentLength() != expectedSize
                    || !expectedContentType.equalsIgnoreCase(head.contentType())) {
                throw new IllegalArgumentException("Tài liệu tải lên không khớp thông tin đã đăng ký");
            }
            if (!StringUtils.hasText(head.eTag())) {
                throw new IllegalArgumentException("Không thể xác nhận phiên bản tài liệu đã tải lên");
            }
            try (var stream = client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build())) {
                byte[] bytes = stream.readNBytes((int) expectedSize + 1);
                if (bytes.length != expectedSize) {
                    throw new IOException("Kích thước tài liệu tải lên không hợp lệ");
                }
                return bytes;
            }
        }
    }

    public Inspection inspectUploadedDocument(String key, long expectedSize, String expectedContentType) throws IOException {
        requirePendingKey(key);
        if (expectedSize <= 0 || expectedSize > 25L * 1024 * 1024) {
            throw new IllegalArgumentException("Kích thước tài liệu không hợp lệ");
        }
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            var head = client.headObject(HeadObjectRequest.builder().bucket(bucket).key(key).build());
            if (head.contentLength() == null || head.contentLength() != expectedSize
                    || !expectedContentType.equalsIgnoreCase(head.contentType())) {
                throw new IllegalArgumentException("Tài liệu tải lên không khớp thông tin đã đăng ký");
            }
            if (!StringUtils.hasText(head.eTag())) {
                throw new IllegalArgumentException("Không thể xác nhận phiên bản tài liệu đã tải lên");
            }
            int length = (int) Math.min(expectedSize, 8192);
            try (var stream = client.getObject(GetObjectRequest.builder().bucket(bucket).key(key)
                    .ifMatch(head.eTag())
                    .range("bytes=0-" + (length - 1)).build())) {
                byte[] signature = stream.readNBytes(length);
                if (signature.length != length) throw new IOException("Không thể đọc chữ ký tài liệu");
                return new Inspection(signature, head.eTag());
            }
        }
    }

    public String copyPending(String key, Long partnerId, Long documentId, String etag) {
        requirePendingKey(key);
        String extension = StringUtils.getFilenameExtension(key);
        String permanentKey = "documents/" + partnerId + "/" + documentId
                + (StringUtils.hasText(extension) ? "." + extension : "");
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            var copy = CopyObjectRequest.builder().copySource(bucket + "/" + key)
                    .destinationBucket(bucket).destinationKey(permanentKey);
            if (StringUtils.hasText(etag)) copy.copySourceIfMatch(etag);
            client.copyObject(copy.build());
            return permanentKey;
        }
    }

    public byte[] readStoredDocument(String key, long expectedSize) throws IOException {
        requirePartnerKey(key);
        if (expectedSize <= 0 || expectedSize > 25L * 1024 * 1024) {
            throw new IllegalArgumentException("Kích thước tài liệu không hợp lệ");
        }
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint);
             var stream = client.getObject(GetObjectRequest.builder().bucket(bucket).key(key).build())) {
            byte[] bytes = stream.readNBytes((int) expectedSize + 1);
            if (bytes.length != expectedSize) throw new IOException("Kích thước tài liệu không khớp");
            return bytes;
        }
    }

    public String createDownloadUrl(String key, String fileName) {
        requireConfigured();
        requirePartnerKey(key);
        if (downloadUrlExpirationSeconds <= 0 || downloadUrlExpirationSeconds > 900) {
            throw new IllegalStateException("Thời hạn URL tải tài liệu partner chưa hợp lệ");
        }
        var get = GetObjectRequest.builder().bucket(bucket).key(key)
                .responseContentDisposition("inline; filename=\"" + safeFileName(fileName) + "\"")
                .build();
        try (var presigner = clients.createPresigner(region, accessKeyId, secretAccessKey, endpoint, true)) {
            return enforceHttps(presigner.presignGetObject(GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofSeconds(downloadUrlExpirationSeconds))
                    .getObjectRequest(get).build()).url().toString());
        }
    }

    public void deletePending(String key) {
        requirePendingKey(key);
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            client.deleteObject(builder -> builder.bucket(bucket).key(key));
        }
    }

    public String promotePending(String key, Long partnerId) {
        requirePendingKey(key);
        String extension = StringUtils.getFilenameExtension(key);
        String permanentKey = "documents/" + partnerId + "/" + UUID.randomUUID()
                + (StringUtils.hasText(extension) ? "." + extension : "");
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            client.copyObject(CopyObjectRequest.builder().copySource(bucket + "/" + key)
                    .destinationBucket(bucket).destinationKey(permanentKey).build());
            client.deleteObject(builder -> builder.bucket(bucket).key(key));
            return permanentKey;
        }
    }

    public void deleteDocument(String key) {
        requirePartnerKey(key);
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            client.deleteObject(builder -> builder.bucket(bucket).key(key));
        }
    }

    @Scheduled(fixedDelayString = "${PARTNER_DOCUMENT_CLEANUP_INTERVAL_MS:3600000}")
    public void cleanupExpiredPendingObjects() {
        if (!StringUtils.hasText(accessKeyId) || !StringUtils.hasText(secretAccessKey)
                || !StringUtils.hasText(bucket)) return;
        Instant cutoff = Instant.now().minus(1, ChronoUnit.HOURS);
        try (var client = clients.createClient(region, accessKeyId, secretAccessKey, endpoint)) {
            String continuation = null;
            do {
                var page = client.listObjectsV2(ListObjectsV2Request.builder().bucket(bucket)
                        .prefix("pending/").continuationToken(continuation).build());
                for (var object : page.contents()) {
                    String[] segments = object.key().split("/");
                    boolean activeDraft = segments.length >= 3 && drafts.find(segments[1]).isPresent();
                    if (object.lastModified() != null && object.lastModified().isBefore(cutoff)
                            && !activeDraft && !documentRepository.existsByStorageObjectKey(object.key())) {
                        client.deleteObject(builder -> builder.bucket(bucket).key(object.key()));
                    }
                }
                continuation = Boolean.TRUE.equals(page.isTruncated()) ? page.nextContinuationToken() : null;
            } while (continuation != null);
        } catch (Exception ex) {
            log.warn("Could not clean up expired business-partner upload objects: {}", ex.getMessage());
        }
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(accessKeyId) || !StringUtils.hasText(secretAccessKey)
                || !StringUtils.hasText(bucket)) {
            throw new IllegalStateException("Supabase Storage cho tài liệu đối tác chưa được cấu hình đầy đủ");
        }
    }

    private void requirePendingKey(String key) {
        if (!StringUtils.hasText(key) || !key.startsWith("pending/") || key.contains("..")
                || !key.matches("[A-Za-z0-9._/-]+")) {
            throw new IllegalArgumentException("Object key tài liệu tạm không hợp lệ");
        }
        requireConfigured();
    }

    private void requirePartnerKey(String key) {
        if (!StringUtils.hasText(key) || !key.matches("(pending|documents)/[A-Za-z0-9._/-]+")
                || key.contains("..")) {
            throw new IllegalArgumentException("Object key tài liệu đối tác không hợp lệ");
        }
    }

    private String safeFileName(String name) {
        String safe = name == null ? "document" : name.replaceAll("[\\r\\n\\\"]", "_");
        return safe.length() > 255 ? safe.substring(0, 255) : safe;
    }

    private String enforceHttps(String url) {
        return url.startsWith("http://") && !url.contains("://localhost") && !url.contains("://127.0.0.1")
                ? "https://" + url.substring("http://".length()) : url;
    }

    public record UploadTarget(String objectKey, String uploadUrl, long expiresInSeconds) { }
    public record Inspection(byte[] signature, String etag) { }
}
