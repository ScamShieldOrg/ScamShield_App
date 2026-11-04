package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.UserStatus;
import com.be.scamshield.dto.request.AdminPartnerReviewRequest;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.PartnerDocument;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.exception.PartnerReviewConflictException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.IndicatorRepository;
import com.be.scamshield.repository.PartnerDocumentRepository;
import com.be.scamshield.repository.PartnerProfileRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.repository.WhitelistEntryRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Optional;
import java.util.Base64;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tools.jackson.databind.ObjectMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminPartnerRegistrationServiceImplTest {
    @Mock private PartnerProfileRepository profiles;
    @Mock private PartnerDocumentRepository documents;
    @Mock private UserRepository users;
    @Mock private IndicatorRepository indicators;
    @Mock private WhitelistEntryRepository whitelistEntries;
    @Mock private AuditLogRepository auditLogs;

    private AdminPartnerRegistrationServiceImpl service;
    private PartnerProfile profile;
    private User reviewer;

    @BeforeEach
    void setUp() {
        service = new AdminPartnerRegistrationServiceImpl(profiles, documents, users, indicators,
                whitelistEntries, auditLogs, new ObjectMapper(),
                Clock.fixed(Instant.parse("2026-10-28T08:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")));
        User partnerUser = User.builder().id(20L).fullName("Người đăng ký").status(UserStatus.INACTIVE.name()).build();
        reviewer = User.builder().id(1L).fullName("Quản trị viên").build();
        profile = PartnerProfile.builder().id(10L).user(partnerUser).legalName("Công ty A")
                .taxCode("0100112437").corporateEmail("a@example.com")
                .officialDomain("example.com.vn").officialHotline("+84 912 345 678")
                .smsBrandName("EXAMPLE").verificationStatus(PartnerVerificationStatus.PENDING).build();
    }

    private AdminPartnerReviewRequest request(PartnerVerificationStatus status, String reason) {
        AdminPartnerReviewRequest request = new AdminPartnerReviewRequest();
        request.setVerificationStatus(status);
        request.setReason(reason);
        return request;
    }

    @Test
    void approvalActivatesPartnerAndCreatesThreeVerifiedIdentifiers() {
        when(users.findById(1L)).thenReturn(Optional.of(reviewer));
        when(profiles.findByIdForReview(10L)).thenReturn(Optional.of(profile));
        AtomicLong nextId = new AtomicLong(100);
        when(indicators.save(any(Indicator.class))).thenAnswer(call -> {
            Indicator indicator = call.getArgument(0);
            indicator.setId(nextId.incrementAndGet());
            return indicator;
        });

        var result = service.review(10L, request(PartnerVerificationStatus.VERIFIED, null), 1L);

        assertThat(result.verificationStatus()).isEqualTo(PartnerVerificationStatus.VERIFIED);
        assertThat(profile.getUser().getStatus()).isEqualTo(UserStatus.ACTIVE.name());
        ArgumentCaptor<WhitelistEntry> entry = ArgumentCaptor.forClass(WhitelistEntry.class);
        verify(whitelistEntries, org.mockito.Mockito.times(3)).save(entry.capture());
        assertThat(entry.getAllValues()).extracting(value -> value.getIndicator().getType())
                .containsExactly("DOMAIN", "PHONE", "SMS_BRAND_NAME");
        assertThat(entry.getAllValues()).extracting(value -> value.getIndicator().getNormalizedValue())
                .containsExactly("example.com.vn", "0912345678", "EXAMPLE");
        assertThat(entry.getAllValues()).allSatisfy(value ->
                assertThat(value.getVerificationStatus()).isEqualTo("VERIFIED"));
        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(audit.capture());
        assertThat(audit.getValue().getActorUser()).isSameAs(reviewer);
        assertThat(audit.getValue().getNewValue()).isEqualTo("VERIFIED");
    }

    @Test
    void rejectionRequiresReasonAndLeavesUserInactive() {
        assertThatThrownBy(() -> service.review(10L,
                request(PartnerVerificationStatus.REJECTED, "  "), 1L))
                .isInstanceOf(com.be.scamshield.exception.BadRequestException.class);
        verifyNoInteractions(profiles, indicators, whitelistEntries, auditLogs);

        when(users.findById(1L)).thenReturn(Optional.of(reviewer));
        when(profiles.findByIdForReview(10L)).thenReturn(Optional.of(profile));
        profile.getUser().setStatus(UserStatus.ACTIVE.name());
        var result = service.review(10L, request(PartnerVerificationStatus.REJECTED, "Không đủ bằng chứng"), 1L);
        assertThat(result.verificationStatus()).isEqualTo(PartnerVerificationStatus.REJECTED);
        assertThat(profile.getUser().getStatus()).isEqualTo(UserStatus.INACTIVE.name());
        verifyNoInteractions(indicators, whitelistEntries);
        ArgumentCaptor<AuditLog> audit = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogs).save(audit.capture());
        assertThat(audit.getValue().getReason()).isEqualTo("Không đủ bằng chứng");
    }

    @Test
    void listPassesStatusSearchAndPageToRepository() {
        var pageable = PageRequest.of(1, 10, org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createdAt", "id"));
        when(profiles.findForAdmin(eq(PartnerVerificationStatus.PENDING), eq("%example%"), eq(pageable)))
                .thenReturn(new PageImpl<>(java.util.List.of(profile), pageable, 11));

        var result = service.list(" EXAMPLE ", PartnerVerificationStatus.PENDING, 1, 10);

        assertThat(result.getCurrentPage()).isEqualTo(1);
        assertThat(result.getTotalItems()).isEqualTo(11);
        assertThat(result.getData()).hasSize(1);
    }

    @Test
    void duplicateReviewIsConflict() {
        profile.setVerificationStatus(PartnerVerificationStatus.VERIFIED);
        when(users.findById(1L)).thenReturn(Optional.of(reviewer));
        when(profiles.findByIdForReview(10L)).thenReturn(Optional.of(profile));
        assertThatThrownBy(() -> service.review(10L,
                request(PartnerVerificationStatus.REJECTED, "Lý do"), 1L))
                .isInstanceOf(PartnerReviewConflictException.class);
        verify(auditLogs, never()).save(any());
    }

    @Test
    void identifierAlreadyVerifiedForAnotherPartnerIsConflict() {
        when(users.findById(1L)).thenReturn(Optional.of(reviewer));
        when(profiles.findByIdForReview(10L)).thenReturn(Optional.of(profile));
        Indicator existing = Indicator.builder().id(5L).type("DOMAIN").normalizedValue("example.com.vn").build();
        when(indicators.findByTypeAndNormalizedValue("DOMAIN", "example.com.vn"))
                .thenReturn(Optional.of(existing));
        when(whitelistEntries.existsByIndicatorIdAndVerificationStatusAndPartnerIdNot(5L, "VERIFIED", 10L))
                .thenReturn(true);
        assertThatThrownBy(() -> service.review(10L,
                request(PartnerVerificationStatus.VERIFIED, null), 1L))
                .isInstanceOf(PartnerReviewConflictException.class);
        assertThat(profile.getUser().getStatus()).isEqualTo(UserStatus.INACTIVE.name());
        verify(auditLogs, never()).save(any());
    }

    @Test
    void documentCannotBeReadThroughAnotherPartner() {
        when(profiles.existsById(10L)).thenReturn(true);
        assertThatThrownBy(() -> service.document(10L, 99L))
                .isInstanceOf(ResourceNotFoundException.class);
        verify(documents).findByIdAndPartnerId(eq(99L), eq(10L));
    }

    @Test
    void documentContentIsReturnedOnlyForItsPartner() {
        byte[] content = "%PDF-test".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        PartnerDocument document = PartnerDocument.builder().id(99L).partner(profile)
                .fileName("license.pdf").contentType("application/pdf")
                .fileSize((long) content.length).content(content).build();
        when(profiles.existsById(10L)).thenReturn(true);
        when(documents.findByIdAndPartnerId(99L, 10L)).thenReturn(Optional.of(document));

        var result = service.document(10L, 99L);

        assertThat(result.fileName()).isEqualTo("license.pdf");
        assertThat(Base64.getDecoder().decode(result.contentBase64())).isEqualTo(content);
    }
}
