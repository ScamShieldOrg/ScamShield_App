package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.FirebasePhoneClient;

import com.be.scamshield.config.FirebasePhoneProperties;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.OtpRateLimitException;
import com.be.scamshield.exception.SmsProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class FirebasePhoneClientTest {
    private FirebasePhoneProperties properties;
    private FirebasePhoneClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        properties = new FirebasePhoneProperties();
        properties.setApiKey("test-api-key");
        RestClient.Builder builder = RestClient.builder().baseUrl("https://identitytoolkit.googleapis.com/v1");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new FirebasePhoneClient(builder.build(), properties);
    }

    @Test
    void sendsE164AndRecaptchaAndReturnsProviderSession() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=test-api-key"))
                .andExpect(method(HttpMethod.POST)).andExpect(header("X-Firebase-Locale", "vi"))
                .andExpect(content().json("{\"phoneNumber\":\"+84912345678\",\"recaptchaToken\":\"captcha\"}"))
                .andRespond(withSuccess("{\"sessionInfo\":\"session\"}", MediaType.APPLICATION_JSON));
        assertThat(client.send("+84912345678", "captcha")).isEqualTo("session");
        server.verify();
    }

    @Test
    void verifiesSmsWithoutExposingFirebaseTokens() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=test-api-key"))
                .andExpect(content().json("{\"sessionInfo\":\"session\",\"code\":\"123456\"}"))
                .andRespond(withSuccess("{\"phoneNumber\":\"+84912345678\",\"idToken\":\"secret\",\"refreshToken\":\"secret\"}", MediaType.APPLICATION_JSON));
        client.verify("session", "123456", "+84912345678");
        server.verify();
    }

    @Test
    void rejectsPhoneMismatch() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=test-api-key"))
                .andRespond(withSuccess("{\"phoneNumber\":\"+84999999999\"}", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> client.verify("session", "123456", "+84912345678"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void translatesInvalidCodeToClientError() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=test-api-key"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"code\":400,\"message\":\"INVALID_CODE\"}}"));
        assertThatThrownBy(() -> client.verify("session", "000000", "+84912345678"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP");
    }

    @Test
    void translatesCaptchaFailureAndQuotaWithoutLeakingCredentials() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=test-api-key"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"CAPTCHA_CHECK_FAILED\"}}"));
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=test-api-key"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));
        assertThatThrownBy(() -> client.send("+84912345678", "invalid"))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("reCAPTCHA");
        assertThatThrownBy(() -> client.send("+84912345678", "captcha"))
                .isInstanceOf(OtpRateLimitException.class).hasMessageNotContaining("test-api-key");
    }

    @Test
    void exposesBillingErrorCodeWithoutProviderDetails() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=test-api-key"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST).contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":{\"message\":\"BILLING_NOT_ENABLED : sensitive-provider-detail\"}}"));
        assertThatThrownBy(() -> client.send("+84912345678", "captcha"))
                .isInstanceOf(SmsProviderException.class).hasMessageContaining("BILLING_NOT_ENABLED")
                .hasMessageNotContaining("sensitive-provider-detail").hasMessageNotContaining("test-api-key");
    }

    @Test
    void unavailableProviderAndMissingConfigurationFailClosed() {
        server.expect(requestTo("https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=test-api-key"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));
        assertThatThrownBy(() -> client.send("+84912345678", "captcha"))
                .isInstanceOf(SmsProviderException.class).hasMessageNotContaining("test-api-key");
        properties.setApiKey("");
        assertThatThrownBy(() -> client.send("+84912345678", "captcha")).isInstanceOf(SmsProviderException.class);
    }
}
