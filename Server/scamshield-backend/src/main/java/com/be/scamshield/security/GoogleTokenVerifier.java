package com.be.scamshield.security;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.HttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collections;

@Component
@Slf4j
public class GoogleTokenVerifier {

    private static final String PLACEHOLDER_CLIENT_ID = "your-google-client-id";

    @Value("${google.client.id:your-google-client-id}")
    private String googleClientId;

    private GoogleIdTokenVerifier verifier;
    private final HttpTransport transport;
    private final JsonFactory jsonFactory;

    public GoogleTokenVerifier() {
        this(new NetHttpTransport(), new GsonFactory());
    }

    public GoogleTokenVerifier(HttpTransport transport, JsonFactory jsonFactory) {
        this.transport = transport;
        this.jsonFactory = jsonFactory;
    }

    public GoogleTokenVerifier(String googleClientId, HttpTransport transport, JsonFactory jsonFactory) {
        this.googleClientId = googleClientId;
        this.transport = transport;
        this.jsonFactory = jsonFactory;
        initVerifier();
    }

    @PostConstruct
    public void init() {
        initVerifier();
    }

    private void initVerifier() {
        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(transport, jsonFactory);
        if (isConfigured()) {
            builder.setAudience(Collections.singletonList(googleClientId.trim()));
            log.info("GoogleTokenVerifier initialized with audience validation.");
        } else {
            log.warn("google.client.id is not configured or uses placeholder. Google token verification will proceed without audience validation (dev mode).");
        }
        this.verifier = builder.build();
    }

    public boolean isConfigured() {
        return StringUtils.hasText(googleClientId) && !PLACEHOLDER_CLIENT_ID.equalsIgnoreCase(googleClientId.trim());
    }

    public GoogleIdToken.Payload verify(String idTokenString) {
        if (!StringUtils.hasText(idTokenString)) {
            return null;
        }

        if (verifier == null) {
            initVerifier();
        }

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString.trim());
            if (idToken != null) {
                return idToken.getPayload();
            }
            log.warn("Google token verification returned null for provided token");
            return null;
        } catch (Exception e) {
            log.error("Google token verification failed: {}", e.getMessage());
            return null;
        }
    }
}
