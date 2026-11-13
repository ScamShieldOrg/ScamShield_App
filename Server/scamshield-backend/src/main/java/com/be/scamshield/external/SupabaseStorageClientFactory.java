package com.be.scamshield.external;

import java.net.URI;

import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

/** Shared construction for S3-compatible clients used by Supabase Storage features. */
@Component
public class SupabaseStorageClientFactory {
    public S3Client createClient(String region, String accessKeyId, String secretAccessKey, String endpoint) {
        var builder = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials(accessKeyId, secretAccessKey));
        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint.trim())).forcePathStyle(true);
        }
        return builder.build();
    }

    public S3Presigner createPresigner(String region, String accessKeyId, String secretAccessKey,
                                       String endpoint, boolean pathStyleAccessEnabled) {
        var builder = S3Presigner.builder()
                .region(Region.of(region))
                .credentialsProvider(credentials(accessKeyId, secretAccessKey));
        if (StringUtils.hasText(endpoint)) {
            builder.endpointOverride(URI.create(endpoint.trim()));
            if (pathStyleAccessEnabled) {
                builder.serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true).build());
            }
        }
        return builder.build();
    }

    private StaticCredentialsProvider credentials(String accessKeyId, String secretAccessKey) {
        return StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKeyId, secretAccessKey));
    }
}
