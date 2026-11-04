package com.be.scamshield.security;

import com.google.api.client.http.HttpTransport;
import com.google.api.client.json.JsonFactory;
import com.google.api.client.json.gson.GsonFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class GoogleTokenVerifierTest {

    @Mock
    private HttpTransport transport;

    private final JsonFactory jsonFactory = new GsonFactory();

    @Test
    void verify_WhenClientIdIsPlaceholder_InitializesWithoutAudienceAndHandlesInvalidToken() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier(transport, jsonFactory);
        ReflectionTestUtils.setField(verifier, "googleClientId", "your-google-client-id");
        verifier.init();

        assertFalse(verifier.isConfigured());
        assertNull(verifier.verify("some-valid-or-invalid-token"));
    }

    @Test
    void verify_WhenClientIdIsBlank_InitializesWithoutAudienceAndHandlesInvalidToken() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier(transport, jsonFactory);
        ReflectionTestUtils.setField(verifier, "googleClientId", "   ");
        verifier.init();

        assertFalse(verifier.isConfigured());
        assertNull(verifier.verify("some-token"));
    }

    @Test
    void verify_WhenTokenIsBlank_ReturnsNull() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier("123456789.apps.googleusercontent.com", transport, jsonFactory);

        assertTrue(verifier.isConfigured());
        assertNull(verifier.verify(""));
        assertNull(verifier.verify("   "));
        assertNull(verifier.verify(null));
    }

    @Test
    void isConfigured_ValidClientId_ReturnsTrue() {
        GoogleTokenVerifier verifier = new GoogleTokenVerifier(transport, jsonFactory);
        ReflectionTestUtils.setField(verifier, "googleClientId", "123456789-abc.apps.googleusercontent.com");
        verifier.init();

        assertTrue(verifier.isConfigured());
    }
}
