package com.be.scamshield.config;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.beans.factory.annotation.Qualifier;

@Configuration
@EnableConfigurationProperties(PartnerBusinessVerificationProperties.class)
public class PartnerBusinessVerificationConfig {
    @Bean
    public RestClient businessVerificationRestClient(PartnerBusinessVerificationProperties properties) {
        return client(properties.getConnectTimeoutSeconds(), properties.getReadTimeoutSeconds());
    }

    @Bean
    public RestClient xinvoiceRestClient() {
        return client(1, 1);
    }

    private RestClient client(int connectSeconds, int readSeconds) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String method) throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(Duration.ofSeconds(connectSeconds));
        factory.setReadTimeout(Duration.ofSeconds(readSeconds));
        return RestClient.builder().requestFactory(factory).build();
    }
}
