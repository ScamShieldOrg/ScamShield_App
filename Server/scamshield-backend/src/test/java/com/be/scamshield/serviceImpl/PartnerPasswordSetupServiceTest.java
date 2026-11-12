package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerPasswordEmailStatus;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.entity.PartnerPasswordLink;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.repository.PartnerPasswordLinkRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.RefreshTokenRepository;
import com.be.scamshield.service.PartnerEmailService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Optional;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.any;

@ExtendWith(MockitoExtension.class)
class PartnerPasswordSetupServiceTest {
    @Mock private PartnerPasswordLinkRepository links;
    @Mock private PartnerProfileRepository profiles;
    @Mock private RefreshTokenRepository refreshTokens;
    @Mock private PasswordEncoder encoder;
    @Mock private PartnerEmailService emailService;

    private PartnerPasswordSetupServiceImpl service;
    private PartnerProfile profile;
    private PartnerPasswordLink link;
    private LocalDateTime now;
    private final String token = "A".repeat(43);

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-11-10T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));
        now = LocalDateTime.now(clock);
        service = new PartnerPasswordSetupServiceImpl(links, profiles, refreshTokens, encoder, emailService, clock);
        profile = PartnerProfile.builder().id(10L).user(User.builder().id(20L).build())
                .verificationStatus(PartnerVerificationStatus.VERIFIED).build();
        link = PartnerPasswordLink.builder().partner(profile).expiresAt(now.plusMinutes(10)).build();
    }

    private void mockLookup() {
        when(links.findByTokenHash(anyString())).thenReturn(Optional.of(link));
        when(profiles.findByIdForReview(10L)).thenReturn(Optional.of(profile));
        when(links.findLockedByTokenHash(anyString())).thenReturn(Optional.of(link));
    }

    @Test
    void validLinkSetsPasswordOnceAndRevokesSessions() {
        mockLookup();
        when(encoder.encode("new-secret")).thenReturn("hashed-password");

        service.setup(token, "new-secret");

        assertThat(profile.getUser().getPasswordHash()).isEqualTo("hashed-password");
        assertThat(profile.getPasswordSetupCompletedAt()).isEqualTo(now);
        assertThat(link.getConsumedAt()).isEqualTo(now);
        verify(refreshTokens).deleteByUser(profile.getUser());
        assertThatThrownBy(() -> service.setup(token, "other-secret"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void expiredLinkCannotChangePassword() {
        link.setExpiresAt(now);
        mockLookup();

        assertThatThrownBy(() -> service.setup(token, "new-secret"))
                .isInstanceOf(BadRequestException.class);
        verify(encoder, never()).encode(anyString());
    }

    @Test
    void rejectedPartnerCannotUseLink() {
        profile.setVerificationStatus(PartnerVerificationStatus.REJECTED);
        mockLookup();

        assertThatThrownBy(() -> service.setup(token, "new-secret"))
                .isInstanceOf(BadRequestException.class);
        verify(encoder, never()).encode(anyString());
    }

    @Test
    void resendingInvalidatesEarlierLinkAndSchedulesEmailAfterCommit() {
        var oldLink = PartnerPasswordLink.builder().partner(profile).expiresAt(now.plusMinutes(1)).build();
        when(profiles.findByIdForReview(10L)).thenReturn(Optional.of(profile));
        when(links.findByPartnerIdAndConsumedAtIsNull(10L)).thenReturn(List.of(oldLink));
        profile.setCorporateEmail("partner@example.com");
        ReflectionTestUtils.setField(service, "uiBaseUrl", "http://localhost:3001");
        TransactionSynchronizationManager.initSynchronization();
        try {
            service.issue(10L);
            assertThat(oldLink.getConsumedAt()).isEqualTo(now);
            assertThat(profile.getPasswordLinkEmailStatus()).isEqualTo(PartnerPasswordEmailStatus.PENDING);
            ArgumentCaptor<PartnerPasswordLink> saved = ArgumentCaptor.forClass(PartnerPasswordLink.class);
            verify(links).save(saved.capture());
            assertThat(saved.getValue().getExpiresAt()).isEqualTo(now.plusMinutes(10));
            verify(emailService, never()).sendPassword(any(), anyString(), anyString(), anyString());
            TransactionSynchronizationManager.getSynchronizations().forEach(sync -> sync.afterCommit());
            verify(emailService).sendPassword(any(), anyString(), anyString(), anyString());
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
