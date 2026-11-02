package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.FirebasePhoneClient;

import com.be.scamshield.constant.OtpType;
import com.be.scamshield.config.FirebasePhoneProperties;
import com.be.scamshield.dto.OtpEntry;
import com.be.scamshield.exception.OtpRateLimitException;
import com.be.scamshield.exception.SmsProviderException;
import com.be.scamshield.service.IOtpStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import static org.mockito.ArgumentMatchers.any;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@SpringBootTest(properties = {
        "app.otp.email-expiration-ms=420000",
        "app.otp.phone-expiration-ms=180000",
        "spring.datasource.url=jdbc:h2:mem:scamshield-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1"
})
@ActiveProfiles("test")
class SmsOtpReservationPersistenceTest {
    @Autowired
    private SmsOtpReservationService service;
    @Autowired
    private OtpServiceImpl otpService;
    @MockitoBean
    private FirebasePhoneClient firebaseClient;
    @MockitoBean
    private JavaMailSender mailSender;
    @Autowired
    private IOtpStore otpStore;
    @Autowired
    private FirebasePhoneProperties properties;
    @MockitoBean
    private Clock applicationClock;
    private Instant now;

    @BeforeEach
    void setUp() {
        otpStore.clear();
        properties.setMaxRequestsPer24Hours(10);
        now = Instant.parse("2026-10-06T03:00:00Z");
        when(applicationClock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        when(applicationClock.instant()).thenReturn(now);
    }

    @Test
    void smsExpiryUsesConfiguredDuration() {
        OtpEntry phone = service.reserve("0912345678");
        assertThat(phone.getExpiresAt()).isEqualTo(phone.getCreatedAt().plusSeconds(180));
    }

    @Test
    void emailExpiryAndMailContentUseConfiguredDuration() throws Exception {
        MimeMessage message = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(message);
        otpService.sendEmailOtp("expiry-test@example.com");
        OtpEntry email = otpStore.findLatest("expiry-test@example.com", OtpType.EMAIL).orElseThrow();
        assertThat(email.getExpiresAt()).isEqualTo(email.getCreatedAt().plusSeconds(420));
        verify(mailSender).send(any(MimeMessage.class));
        var output = new ByteArrayOutputStream();
        message.writeTo(output);
        assertThat(output.toString(StandardCharsets.UTF_8)).contains("420");
    }

    @Test
    void enforcesProjectBudgetAndDoesNotRefundCommittedReservations() {
        for (int i = 0; i < 10; i++) {
            service.reserve("09" + String.format("%08d", i));
        }
        assertThatThrownBy(() -> service.reserve("0988888888")).isInstanceOf(OtpRateLimitException.class);
        assertThat(otpStore.countPhoneOtpRequestsSince(LocalDateTime.now(applicationClock).minusHours(24))).isEqualTo(10);
        when(applicationClock.instant()).thenReturn(now.plusSeconds(24 * 3600));
        service.reserve("0988888888");
        assertThat(otpStore.countPhoneOtpRequestsSince(LocalDateTime.now(applicationClock).minusHours(24))).isEqualTo(1);
    }

    @Test
    void cooldownSurvivesNewServiceCallAndAllowsResendAtSixtySeconds() {
        service.reserve("0912345678");
        assertThatThrownBy(() -> service.reserve("0912345678")).isInstanceOf(OtpRateLimitException.class);
        when(applicationClock.instant()).thenReturn(now.plusSeconds(60));
        service.reserve("0912345678");
        assertThat(otpStore.countPhoneOtpRequestsSince(LocalDateTime.now(applicationClock).minusHours(24))).isEqualTo(2);
    }

    @Test
    void emailChallengesDoNotCountButConsumedPhoneChallengesStillCount() {
        properties.setMaxRequestsPer24Hours(1);
        LocalDateTime time = LocalDateTime.now(applicationClock);
        otpStore.save(OtpEntry.builder().target("partner@gmail.com").type(OtpType.EMAIL)
                .otpCode("654321").createdAt(time).expiresAt(time.plusMinutes(5)).build(), Duration.ofMinutes(5));
        OtpEntry phone = service.reserve("0912345678");
        phone.setVerified(true);
        otpStore.save(phone, Duration.ofMinutes(5));
        assertThatThrownBy(() -> service.reserve("0912345679")).isInstanceOf(OtpRateLimitException.class);
        assertThat(otpStore.countPhoneOtpRequestsSince(LocalDateTime.now(applicationClock).minusHours(24))).isEqualTo(1);
    }

    @Test
    void firebaseFailureKeepsCommittedPhoneHistoryAndUsesQuota() {
        properties.setMaxRequestsPer24Hours(1);
        when(firebaseClient.send("+84912345678", "captcha"))
                .thenThrow(new SmsProviderException("provider unavailable"));
        assertThatThrownBy(() -> otpService.sendPhoneOtp("0912345678", "captcha"))
                .isInstanceOf(SmsProviderException.class);
        assertThat(otpStore.countPhoneOtpRequestsSince(LocalDateTime.now(applicationClock).minusHours(24))).isEqualTo(1);
        assertThat(otpStore.findLatest("0912345678", OtpType.PHONE).orElseThrow().getProviderSessionInfo()).isNull();
        assertThatThrownBy(() -> otpService.sendPhoneOtp("0912345679", "captcha"))
                .isInstanceOf(OtpRateLimitException.class);
        verify(firebaseClient).send("+84912345678", "captcha");
    }

    @Test
    void concurrentRequestsCannotExceedDatabaseBudget() throws Exception {
        properties.setMaxRequestsPer24Hours(2);
        List<Future<Boolean>> results = new ArrayList<>();
        try (var executor = Executors.newFixedThreadPool(4)) {
            for (int i = 0; i < 4; i++) {
                String phone = "09" + String.format("%08d", i);
                results.add(executor.submit(() -> {
                    try {
                        service.reserve(phone);
                        return true;
                    } catch (OtpRateLimitException ex) {
                        return false;
                    }
                }));
            }
            int accepted = 0;
            for (Future<Boolean> result : results) {
                if (result.get()) {
                    accepted++;
                }
            }
            assertThat(accepted).isEqualTo(2);
        }
        assertThat(otpStore.countPhoneOtpRequestsSince(LocalDateTime.now(applicationClock).minusHours(24))).isEqualTo(2);
    }
}
