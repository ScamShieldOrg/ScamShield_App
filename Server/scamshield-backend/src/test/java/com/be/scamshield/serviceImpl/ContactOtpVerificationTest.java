package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.FirebasePhoneClient;
import com.be.scamshield.external.InMemoryOtpStore;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.exception.SmsProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

class ContactOtpVerificationTest {
    private static final String EMAIL = "partner@example.com";
    private static final String PHONE = "0912345678";
    private InMemoryOtpStore store;
    private FirebasePhoneClient client;
    private OtpServiceImpl service;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-10-27T03:00:00Z"), ZoneOffset.UTC);
        LocalDateTime now = LocalDateTime.now(clock);
        store = new InMemoryOtpStore();
        client = mock(FirebasePhoneClient.class);
        service = new OtpServiceImpl(store, mock(JavaMailSender.class), client,
                mock(SmsOtpReservationService.class), clock);
        store.save(OtpEntry.builder().target(EMAIL).type(OtpType.EMAIL).otpCode("654321")
                .createdAt(now).expiresAt(now.plusMinutes(5)).failedAttempts(2).build(), Duration.ofMinutes(5));
        store.save(OtpEntry.builder().target(PHONE).type(OtpType.PHONE).provider("FIREBASE")
                .providerSessionInfo("session").createdAt(now).expiresAt(now.plusMinutes(5)).build(),
                Duration.ofMinutes(5));
    }

    @Test
    void correctEmailRemainsUsableAcrossWrongPhoneRetriesAndBothCodesCanThenBeConsumed() {
        doThrow(new IllegalArgumentException("wrong code"))
                .when(client).verify("session", "000000", "+84912345678");

        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThatThrownBy(() -> service.verifyContactOtps(" PARTNER@EXAMPLE.COM ", "654321", PHONE, "000000"))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP điện thoại");
            assertThat(entry(EMAIL, OtpType.EMAIL).getFailedAttempts()).isEqualTo(2);
            assertThat(entry(EMAIL, OtpType.EMAIL).isVerified()).isFalse();
            assertThat(entry(PHONE, OtpType.PHONE).getFailedAttempts()).isEqualTo(attempt);
            assertThat(entry(PHONE, OtpType.PHONE).isVerified()).isFalse();
        }

        assertThat(service.verifyContactOtps(EMAIL, "654321", PHONE, "123456")).isTrue();
        assertThat(entry(EMAIL, OtpType.EMAIL).isVerified()).isTrue();
        assertThat(entry(PHONE, OtpType.PHONE).isVerified()).isTrue();
    }

    @Test
    void malformedPhoneCodesDoNotExhaustCorrectEmailAttempts() {
        for (int attempt = 0; attempt < 6; attempt++) {
            assertThatThrownBy(() -> service.verifyContactOtps(EMAIL, "654321", PHONE, "bad"))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP điện thoại");
            assertThat(entry(EMAIL, OtpType.EMAIL).getFailedAttempts()).isEqualTo(2);
        }
        assertThat(entry(PHONE, OtpType.PHONE).getFailedAttempts()).isZero();
        verifyNoInteractions(client);
    }

    @Test
    void incorrectEmailStillAccumulatesAttemptsAndLocksBeforePhoneValidation() {
        for (int attempt = 3; attempt <= 5; attempt++) {
            assertThatThrownBy(() -> service.verifyContactOtps(EMAIL, "000000", PHONE, "123456"))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP email");
            assertThat(entry(EMAIL, OtpType.EMAIL).getFailedAttempts()).isEqualTo(attempt);
        }
        assertThatThrownBy(() -> service.verifyContactOtps(EMAIL, "654321", PHONE, "123456"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP email");
        assertThat(entry(EMAIL, OtpType.EMAIL).isVerified()).isFalse();
        verifyNoInteractions(client);
    }

    @Test
    void phoneProviderFailureRestoresEmailReservationAndPreservesOriginalError() {
        SmsProviderException failure = new SmsProviderException("unavailable");
        doThrow(failure).when(client).verify("session", "123456", "+84912345678");

        assertThatThrownBy(() -> service.verifyContactOtps(EMAIL, "654321", PHONE, "123456"))
                .isSameAs(failure);
        assertThat(entry(EMAIL, OtpType.EMAIL).getFailedAttempts()).isEqualTo(2);
        assertThat(entry(PHONE, OtpType.PHONE).getFailedAttempts()).isZero();
        assertThat(entry(EMAIL, OtpType.EMAIL).isVerified()).isFalse();
        assertThat(entry(PHONE, OtpType.PHONE).isVerified()).isFalse();
    }

    @Test
    void refundDoesNotOverwriteAnotherEmailAttemptMadeDuringPhoneValidation() {
        doAnswer(invocation -> {
            assertThat(entry(EMAIL, OtpType.EMAIL).getFailedAttempts()).isEqualTo(3);
            store.incrementAndGetFailedAttempts(EMAIL, OtpType.EMAIL);
            throw new IllegalArgumentException("wrong code");
        }).when(client).verify("session", "000000", "+84912345678");

        assertThatThrownBy(() -> service.verifyContactOtps(EMAIL, "654321", PHONE, "000000"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP điện thoại");
        assertThat(entry(EMAIL, OtpType.EMAIL).getFailedAttempts()).isEqualTo(3);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void failedPhoneValidationDoesNotRefundReplacementEmailChallenge(boolean reuseCode) {
        OtpEntry replacement = entry(EMAIL, OtpType.EMAIL);
        if (reuseCode) {
            replacement.setCreatedAt(replacement.getCreatedAt().plusMinutes(1));
        } else {
            replacement.setOtpCode("111111");
        }
        replacement.setFailedAttempts(1);
        doAnswer(invocation -> {
            store.save(replacement, Duration.ofMinutes(5));
            throw new IllegalArgumentException("wrong code");
        }).when(client).verify("session", "000000", "+84912345678");

        assertThatThrownBy(() -> service.verifyContactOtps(EMAIL, "654321", PHONE, "000000"))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OTP điện thoại");
        OtpEntry remaining = entry(EMAIL, OtpType.EMAIL);
        assertThat(remaining.getFailedAttempts()).isEqualTo(1);
        assertThat(remaining.getOtpCode()).isEqualTo(replacement.getOtpCode());
        assertThat(remaining.getCreatedAt()).isEqualTo(replacement.getCreatedAt());
        assertThat(remaining.isVerified()).isFalse();
    }

    private OtpEntry entry(String target, OtpType type) {
        return store.findLatest(target, type).orElseThrow();
    }
}
