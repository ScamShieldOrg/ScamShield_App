package com.be.scamshield.config;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(PartnerBusinessVerificationProperties.class)
public class PartnerBusinessVerificationConfig {
    @Bean
    public RestClient businessVerificationRestClient(PartnerBusinessVerificationProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory() {
            @Override
            protected void prepareConnection(HttpURLConnection connection, String method) throws IOException {
                super.prepareConnection(connection, method);
                connection.setInstanceFollowRedirects(false);
            }
        };
        factory.setConnectTimeout(Duration.ofSeconds(properties.getConnectTimeoutSeconds()));
        factory.setReadTimeout(Duration.ofSeconds(properties.getReadTimeoutSeconds()));
        return RestClient.builder().requestFactory(factory).build();
    }
}
