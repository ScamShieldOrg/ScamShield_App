package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.FirebasePhoneClient;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.exception.SmsProviderException;
import com.be.scamshield.service.IOtpStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.dao.CannotSerializeTransactionException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SmsOtpServiceTest {
    private IOtpStore repository;
    private FirebasePhoneClient client;
    private SmsOtpReservationService reservations;
    private OtpServiceImpl service;
    private OtpEntry otp;

    @BeforeEach
    void setUp() {
        repository = mock(IOtpStore.class);
        when(repository.markVerified(any(), any())).thenReturn(true);
        when(repository.incrementAndGetFailedAttempts(any(), any())).thenAnswer(inv -> 1);
        client = mock(FirebasePhoneClient.class);
        reservations = mock(SmsOtpReservationService.class);
        Clock clock = Clock.fixed(Instant.parse("2026-10-06T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        service = new OtpServiceImpl(repository, mock(JavaMailSender.class), client, reservations, clock);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "phoneOtpExpirationMs", 180000L);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "emailOtpExpirationMs", 300000L);
        LocalDateTime now = LocalDateTime.now(clock);
        otp = OtpEntry.builder().target("0912345678").type(OtpType.PHONE).provider("FIREBASE")
                .providerSessionInfo("session").createdAt(now).expiresAt(now.plusMinutes(5)).build();
    }

    @Test
    void reservesBeforeSendingAndStoresOnlyFirebaseSession() {
        when(reservations.reserve("0912345678")).thenReturn(otp);
        when(client.send("+84912345678", "captcha")).thenReturn("new-session");
        service.sendPhoneOtp("+84 912 345 678", "captcha");
        verify(reservations).reserve("0912345678");
        verify(repository).save(eq(otp), any(Duration.class));
        assertThat(otp.getOtpCode()).isNull();
        assertThat(otp.getProviderSessionInfo()).isEqualTo("new-session");
    }

    @Test
    void providerFailureDoesNotSaveAnUsableChallengeOrRefundReservation() {
        when(reservations.reserve("0912345678")).thenReturn(otp);
        when(client.send("+84912345678", "captcha")).thenThrow(new SmsProviderException("unavailable"));
        assertThatThrownBy(() -> service.sendPhoneOtp("0912345678", "captcha")).isInstanceOf(SmsProviderException.class);
        verify(reservations).reserve("0912345678");
        verifyNoInteractions(repository);
    }

    @Test
    void serializationFailureStopsBeforeFirebaseAndReturnsSafeError() {
        when(reservations.reserve("0912345678"))
                .thenThrow(new CannotSerializeTransactionException("database conflict"));
        assertThatThrownBy(() -> service.sendPhoneOtp("0912345678", "captcha"))
                .isInstanceOf(SmsProviderException.class).hasMessageContaining("vui lòng thử lại sau");
        verify(client, never()).send(any(), any());
        verifyNoInteractions(repository);
    }

    @Test
    void normalizesEmailBeforeVerificationAndConsumesItsCode() {
        LocalDateTime now = otp.getCreatedAt();
        OtpEntry emailOtp = OtpEntry.builder().target("partner@gmail.com").type(OtpType.EMAIL)
                .otpCode("654321").createdAt(now).expiresAt(now.plusMinutes(5)).isVerified(false).failedAttempts(0).build();
        when(repository.findLatest("partner@gmail.com", OtpType.EMAIL))
                .thenReturn(Optional.of(emailOtp));
        assertThat(service.verifyOtp(" PARTNER@GMAIL.COM ", "654321", OtpType.EMAIL)).isTrue();
        assertThat(emailOtp.isVerified()).isTrue();
        verifyNoInteractions(client);
    }

    @Test
    void successConsumesChallengeOnceAndClearsSession() {
        when(repository.findLatest("0912345678", OtpType.PHONE)).thenReturn(Optional.of(otp));
        assertThat(service.verifyOtp("+84912345678", "123456", OtpType.PHONE)).isTrue();
        assertThat(otp.isVerified()).isTrue();
        assertThat(otp.getProviderSessionInfo()).isNull();
        assertThatThrownBy(() -> service.verifyOtp("0912345678", "123456", OtpType.PHONE))
                .isInstanceOf(IllegalArgumentException.class);
        verify(client, times(1)).verify("session", "123456", "+84912345678");
    }

    @Test
    void blocksAfterFiveInvalidAttempts() {
        when(repository.findLatest("0912345678", OtpType.PHONE)).thenReturn(Optional.of(otp));
        when(repository.incrementAndGetFailedAttempts("0912345678", OtpType.PHONE)).thenAnswer(inv -> {
            int next = otp.getFailedAttempts() + 1;
            otp.setFailedAttempts(next);
            return next;
        });
        doThrow(new IllegalArgumentException("invalid code")).when(client).verify("session", "000000", "+84912345678");
        for (int attempt = 0; attempt < 6; attempt++) {
            assertThatThrownBy(() -> service.verifyOtp("0912345678", "000000", OtpType.PHONE))
                    .isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(otp.getFailedAttempts()).isEqualTo(6);
        verify(client, times(5)).verify("session", "000000", "+84912345678");
    }

    @Test
    void expiredAndLegacyPhoneChallengesCannotBypassFirebase() {
        when(repository.findLatest("0912345678", OtpType.PHONE)).thenReturn(Optional.of(otp));
        otp.setExpiresAt(otp.getCreatedAt());
        assertThatThrownBy(() -> service.verifyOtp("0912345678", "123456", OtpType.PHONE))
                .isInstanceOf(IllegalArgumentException.class);
        otp.setExpiresAt(otp.getCreatedAt().plusMinutes(5));
        otp.setProvider(null);
        otp.setOtpCode("123456");
        assertThatThrownBy(() -> service.verifyOtp("0912345678", "123456", OtpType.PHONE))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(client);
    }

    @Test
    void missingCaptchaAndInvalidPhoneFailBeforeReservation() {
        assertThatThrownBy(() -> service.sendPhoneOtp("0912345678", "")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> service.sendPhoneOtp("not-a-phone", "captcha")).isInstanceOf(RuntimeException.class);
        verifyNoInteractions(reservations, client);
    }

    @Test
    void providerOutageDoesNotCountAsIncorrectCode() {
        when(repository.findLatest("0912345678", OtpType.PHONE)).thenReturn(Optional.of(otp));
        doThrow(new SmsProviderException("unavailable")).when(client).verify("session", "123456", "+84912345678");
        assertThatThrownBy(() -> service.verifyOtp("0912345678", "123456", OtpType.PHONE))
                .isInstanceOf(SmsProviderException.class);
        assertThat(otp.getFailedAttempts()).isZero();
        verify(repository, never()).save(any(), any());
    }
}
