package com.be.scamshield.external;

import com.be.scamshield.dto.response.PresignedUrlResponse;
import com.be.scamshield.exception.DisputeStorageException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.net.URI;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Slf4j
public class SupabaseStorageService {

    @Value("${app.aws.s3.region:${app.supabase.storage.region:${AWS_REGION:${SUPABASE_STORAGE_REGION:ap-south-1}}}}")
    private String region;

    @Value("${app.aws.s3.access-key-id:${app.supabase.storage.access-key-id:${AWS_ACCESS_KEY_ID:${SUPABASE_STORAGE_ACCESS_KEY:}}}}")
    private String accessKeyId;

    @Value("${app.aws.s3.secret-access-key:${app.supabase.storage.secret-access-key:${AWS_SECRET_ACCESS_KEY:${SUPABASE_STORAGE_SECRET_KEY:}}}}")
    private String secretAccessKey;

    @Value("${app.aws.s3.bucket-name:${app.supabase.storage.bucket-name:${AWS_S3_BUCKET_NAME:${SUPABASE_STORAGE_BUCKET_NAME:evidences}}}}")
    private String bucketName;

    @Value("${app.aws.s3.endpoint-override:${app.supabase.storage.endpoint-override:${AWS_S3_ENDPOINT_OVERRIDE:${SUPABASE_STORAGE_ENDPOINT:}}}}")
    private String endpointOverride;

    @Value("${app.aws.s3.dispute-bucket-name:${app.supabase.storage.dispute-bucket-name:${AWS_DISPUTE_BUCKET_NAME:${SUPABASE_DISPUTE_BUCKET_NAME:${AWS_S3_BUCKET_NAME:evidences}}}}}")
    private String disputeBucketName;

    @Value("${app.aws.s3.dispute-url-expiration-seconds:${app.supabase.storage.dispute-url-expiration-seconds:${DISPUTE_FILE_URL_EXPIRATION_SECONDS:900}}}")
    private long disputeUrlExpirationSeconds;

    @jakarta.annotation.PostConstruct
    public void init() {
        log.info("[StorageService] Initialized with AccessKeyId='{}', Region='{}', Bucket='{}', DisputeBucket='{}', EndpointOverride='{}'", 
                StringUtils.hasText(getAccessKeyId()) ? "***" : "(empty)", 
                getRegion(),
                getBucketName(),
                getDisputeBucketName(),
                StringUtils.hasText(getEndpointOverride()) ? getEndpointOverride() : "(none - using standard AWS S3)");
        if (isStorageConfigured()) {
            log.info("S3 Storage successfully configured: bucket={}, disputeBucket={}, region={}", 
                    getBucketName(), getDisputeBucketName(), getRegion());
        } else {
            log.warn("S3 Storage credentials NOT detected. Please check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env");
        }
    }

    public boolean isStorageConfigured() {
        return StringUtils.hasText(getAccessKeyId()) 
                && StringUtils.hasText(getSecretAccessKey());
    }

    public boolean isAwsConfigured() {
        return isStorageConfigured();
    }

    private String getAccessKeyId() {
        for (String key : new String[]{"AWS_ACCESS_KEY_ID", "SUPABASE_STORAGE_ACCESS_KEY"}) {
            String prop = System.getProperty(key);
            if (StringUtils.hasText(prop)) return prop.trim();
            String env = System.getenv(key);
            if (StringUtils.hasText(env)) return env.trim();
        }
        if (StringUtils.hasText(accessKeyId)) {
            return accessKeyId.trim();
        }
        return "";
    }

    private String getSecretAccessKey() {
        for (String key : new String[]{"AWS_SECRET_ACCESS_KEY", "SUPABASE_STORAGE_SECRET_KEY"}) {
            String prop = System.getProperty(key);
            if (StringUtils.hasText(prop)) return prop.trim();
            String env = System.getenv(key);
            if (StringUtils.hasText(env)) return env.trim();
        }
        if (StringUtils.hasText(secretAccessKey)) {
            return secretAccessKey.trim();
        }
        return "";
    }

    private String getEndpointOverride() {
        for (String key : new String[]{"AWS_S3_ENDPOINT_OVERRIDE", "SUPABASE_STORAGE_ENDPOINT"}) {
            String prop = System.getProperty(key);
            if (StringUtils.hasText(prop)) return prop.trim();
            String env = System.getenv(key);
            if (StringUtils.hasText(env)) return env.trim();
        }
        if (StringUtils.hasText(endpointOverride)) {
            return endpointOverride.trim();
        }
        return "";
    }

    private String getBucketName() {
        for (String key : new String[]{"AWS_S3_BUCKET_NAME", "SUPABASE_STORAGE_BUCKET_NAME"}) {
            String prop = System.getProperty(key);
            if (StringUtils.hasText(prop)) return prop.trim();
            String env = System.getenv(key);
            if (StringUtils.hasText(env)) return env.trim();
        }
        if (StringUtils.hasText(bucketName)) {
            return bucketName.trim();
        }
        return "evidences";
    }

    private String getRegion() {
        for (String key : new String[]{"AWS_REGION", "SUPABASE_STORAGE_REGION"}) {
            String prop = System.getProperty(key);
            if (StringUtils.hasText(prop)) return prop.trim();
            String env = System.getenv(key);
            if (StringUtils.hasText(env)) return env.trim();
        }
        if (StringUtils.hasText(region)) {
            return region.trim();
        }
        return "ap-south-1";
    }

    public String getDisputeBucketName() {
        if (disputeBucketName != null) {
            String trimmed = disputeBucketName.trim();
            if (trimmed.isEmpty()) {
                return "";
            }
            return trimmed;
        }
        for (String key : new String[]{"AWS_DISPUTE_BUCKET_NAME", "SUPABASE_DISPUTE_BUCKET_NAME", "AWS_S3_BUCKET_NAME", "SUPABASE_STORAGE_BUCKET_NAME"}) {
            String prop = System.getProperty(key);
            if (StringUtils.hasText(prop)) return prop.trim();
            String env = System.getenv(key);
            if (StringUtils.hasText(env)) return env.trim();
        }
        return getBucketName();
    }

    public UploadResult uploadFile(MultipartFile file, String folder) {
        try {
            byte[] bytes = file.getBytes();
            String fileHash = calculateHash(bytes);
            String originalFilename = file.getOriginalFilename();
            String extension = StringUtils.getFilenameExtension(originalFilename);
            String objectKey = String.format("%s/%s_%s%s", 
                    folder, 
                    UUID.randomUUID().toString().substring(0, 8), 
                    System.currentTimeMillis(),
                    extension != null ? "." + extension : "");

            if (!isStorageConfigured()) {
                throw new IllegalArgumentException("S3 Storage credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env!");
            }

            try (S3Client s3Client = createS3Client()) {
                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(getBucketName())
                        .key(objectKey)
                        .contentType(file.getContentType())
                        .build();

                s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
            }

            String fileUrl = buildPublicUrl(objectKey);
            log.info("File uploaded successfully to S3 Storage: {}", fileUrl);

            return new UploadResult(fileUrl, fileHash, objectKey, originalFilename);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to upload file to S3 Storage: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to upload file to S3 Storage: " + e.getMessage(), e);
        }
    }

    public void deleteFile(String objectKey) {
        if (!isStorageConfigured() || !StringUtils.hasText(objectKey)) {
            return;
        }
        try (S3Client s3Client = createS3Client()) {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(getBucketName())
                    .key(objectKey)
                    .build();
            s3Client.deleteObject(deleteRequest);
            log.info("Deleted object from S3 Storage: {}", objectKey);
        } catch (Exception e) {
            log.error("Failed to delete file from S3 Storage [key={}]: {}", objectKey, e.getMessage(), e);
            throw new RuntimeException("Failed to delete file from S3 Storage: " + e.getMessage(), e);
        }
    }

    public UploadResult uploadDisputeFile(MultipartFile file) {
        requireDisputeStorageConfigured();
        String originalFilename = file.getOriginalFilename();
        String extension = StringUtils.getFilenameExtension(originalFilename);
        String objectKey = "disputes/" + UUID.randomUUID() + (extension != null ? "." + extension : "");
        boolean uploadStarted = false;
        try {
            byte[] bytes = file.getBytes();
            String fileHash = calculateHash(bytes);
            try (S3Client s3Client = createS3Client()) {
                PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                        .bucket(getDisputeBucketName())
                        .key(objectKey)
                        .contentType(file.getContentType())
                        .build();
                uploadStarted = true;
                s3Client.putObject(putObjectRequest, RequestBody.fromBytes(bytes));
            }
            return new UploadResult("s3://" + getDisputeBucketName() + "/" + objectKey,
                    fileHash, objectKey, originalFilename);
        } catch (Exception ex) {
            String errorCode = null;
            if (ex instanceof S3Exception s3Error) {
                errorCode = s3Error.awsErrorDetails() == null ? null : s3Error.awsErrorDetails().errorCode();
                log.error("Dispute upload failed: HTTP {}, S3 code {}, requestId {}",
                        s3Error.statusCode(), errorCode, s3Error.requestId());
            } else {
                log.error("Dispute upload failed: {}", ex.getClass().getSimpleName());
            }
            if (uploadStarted) {
                try {
                    deleteDisputeFile(objectKey);
                } catch (Exception cleanupFailure) {
                    ex.addSuppressed(cleanupFailure);
                    log.warn("Could not clean up failed dispute upload [key={}]", objectKey);
                }
            }
            if ("NoSuchBucket".equals(errorCode)) {
                throw new DisputeStorageException("Không tìm thấy bucket tài liệu khiếu nại; hãy kiểm tra cấu hình AWS_S3_BUCKET_NAME hoặc SUPABASE_DISPUTE_BUCKET_NAME", ex);
            }
            throw new DisputeStorageException("Không thể lưu tài liệu khiếu nại lúc này; vui lòng thử lại sau", ex);
        }
    }

    public String createDisputeDownloadUrl(String objectKey) {
        requireDisputeStorageConfigured();
        requireDisputeObjectKey(objectKey);
        if (disputeUrlExpirationSeconds <= 0 || disputeUrlExpirationSeconds > 604800) {
            throw new DisputeStorageException("Thời hạn liên kết tài liệu khiếu nại chưa được cấu hình hợp lệ");
        }
        try (S3Presigner presigner = createS3Presigner(true)) {
            GetObjectRequest objectRequest = GetObjectRequest.builder()
                    .bucket(getDisputeBucketName())
                    .key(objectKey)
                    .build();
            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofSeconds(disputeUrlExpirationSeconds))
                    .getObjectRequest(objectRequest)
                    .build();
            return presigner.presignGetObject(presignRequest).url().toString();
        } catch (Exception ex) {
            throw new DisputeStorageException("Không thể tạo liên kết tải tài liệu khiếu nại lúc này; vui lòng thử lại sau", ex);
        }
    }

    public void deleteDisputeFile(String objectKey) {
        requireDisputeStorageConfigured();
        requireDisputeObjectKey(objectKey);
        try (S3Client s3Client = createS3Client()) {
            DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                    .bucket(getDisputeBucketName())
                    .key(objectKey)
                    .build();
            s3Client.deleteObject(deleteRequest);
        } catch (Exception ex) {
            throw new DisputeStorageException("Không thể xóa tài liệu khiếu nại lúc này; vui lòng thử lại sau", ex);
        }
    }

    private void requireDisputeStorageConfigured() {
        if (!isStorageConfigured() || !StringUtils.hasText(getDisputeBucketName())) {
            throw new DisputeStorageException("Kho lưu trữ tài liệu khiếu nại chưa được cấu hình");
        }
    }

    private void requireDisputeObjectKey(String objectKey) {
        if (!StringUtils.hasText(objectKey) || !objectKey.startsWith("disputes/")) {
            throw new DisputeStorageException("Không thể truy cập tài liệu khiếu nại do thông tin lưu trữ không hợp lệ");
        }
    }

    public PresignedUrlResponse generatePresignedUploadUrl(String fileName, String contentType) {
        String extension = StringUtils.getFilenameExtension(fileName);
        String objectKey = String.format("evidences/presigned_%s_%s%s",
                UUID.randomUUID().toString().substring(0, 8),
                System.currentTimeMillis(),
                extension != null ? "." + extension : "");

        long expirationSeconds = 900; // 15 minutes

        if (!isStorageConfigured()) {
            throw new IllegalArgumentException("S3 Storage credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env!");
        }

        try (S3Presigner presigner = createS3Presigner()) {
            PutObjectRequest objectRequest = PutObjectRequest.builder()
                    .bucket(getBucketName())
                    .key(objectKey)
                    .contentType(contentType)
                    .build();

            PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofSeconds(expirationSeconds))
                    .putObjectRequest(objectRequest)
                    .build();

            PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);
            String uploadUrl = presignedRequest.url().toString();
            String fileUrl = buildPublicUrl(objectKey);

            return PresignedUrlResponse.builder()
                    .uploadUrl(uploadUrl)
                    .fileUrl(fileUrl)
                    .objectKey(objectKey)
                    .expiresInSeconds(expirationSeconds)
                    .build();
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for S3 Storage: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to generate S3 Storage presigned URL: " + e.getMessage(), e);
        }
    }

    public String buildPublicUrl(String objectKey) {
        String override = getEndpointOverride();
        if (StringUtils.hasText(override)) {
            if (override.contains("supabase.co") || override.contains("/storage/v1/s3")) {
                String baseUrl = override.replaceAll("/storage/v1/s3/?$", "").replaceAll("/+$", "");
                return String.format("%s/storage/v1/object/public/%s/%s", baseUrl, getBucketName(), objectKey);
            }
            return String.format("%s/%s/%s", override, getBucketName(), objectKey);
        }
        return String.format("https://%s.s3.%s.amazonaws.com/%s", getBucketName(), getRegion(), objectKey);
    }

    public String calculateHash(byte[] fileBytes) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedHash = digest.digest(fileBytes);
            return HexFormat.of().formatHex(encodedHash);
        } catch (Exception e) {
            log.error("Failed to compute SHA-256 hash", e);
            return "HASH_ERROR";
        }
    }

    private S3Client createS3Client() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(getAccessKeyId(), getSecretAccessKey());
        var builder = S3Client.builder()
                .region(Region.of(getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials));

        String override = getEndpointOverride();
        if (StringUtils.hasText(override)) {
            builder.endpointOverride(URI.create(override))
                    .forcePathStyle(true);
        }
        return builder.build();
    }

    private S3Presigner createS3Presigner() {
        return createS3Presigner(false);
    }

    private S3Presigner createS3Presigner(boolean pathStyleAccessEnabled) {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(getAccessKeyId(), getSecretAccessKey());
        var builder = S3Presigner.builder()
                .region(Region.of(getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(credentials));

        String override = getEndpointOverride();
        if (StringUtils.hasText(override)) {
            builder.endpointOverride(URI.create(override));
            if (pathStyleAccessEnabled) {
                builder.serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build());
            }
        }
        return builder.build();
    }

    public record UploadResult(String fileUrl, String fileHash, String objectKey, String originalFilename) {}
}
