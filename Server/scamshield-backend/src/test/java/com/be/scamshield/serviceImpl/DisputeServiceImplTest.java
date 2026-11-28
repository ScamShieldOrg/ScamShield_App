package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.ConfirmedIndicatorStatus;
import com.be.scamshield.constant.DisputeStatus;
import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.dto.request.DisputeListRequest;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Dispute;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.UnauthorizedException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.repository.DisputeEvidenceRepository;
import com.be.scamshield.repository.DisputeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DisputeServiceImplTest {
    @Mock private DisputeRepository disputes;
    @Mock private DisputeEvidenceRepository evidence;
    @Mock private SupabaseStorageService storage;
    private final Clock clock = Clock.fixed(Instant.parse("2026-11-19T08:00:00Z"), ZoneOffset.UTC);

    private DisputeServiceImpl service() {
        return new DisputeServiceImpl(disputes, evidence, clock, storage);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void listRejectsInvalidUser(Long userId) {
        assertThatThrownBy(() -> service().getMyDisputes(userId, new DisputeListRequest()))
                .isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(disputes, evidence, storage);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(longs = {0, -1})
    void summaryRejectsInvalidUser(Long userId) {
        assertThatThrownBy(() -> service().getMySummary(userId))
                .isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(disputes, evidence, storage);
    }

    @Test
    void listMapsSubmittedDisputeAndIndicator() {
        stubList(dispute("Displayed phone"));
        var item = service().getMyDisputes(7L, new DisputeListRequest()).getData().getFirst();
        assertThat(item.id()).isEqualTo(41L);
        assertThat(item.disputeCode()).isEqualTo("DSP-41");
        assertThat(item.status()).isEqualTo(DisputeStatus.PENDING);
        assertThat(item.indicator().displayValue()).isEqualTo("Displayed phone");
        assertThat(item.indicator().blacklistStatus()).isEqualTo(ConfirmedIndicatorStatus.ACTIVE);
        assertThat(item.evidenceCount()).isZero();
        assertThat(item.attachments()).isEmpty();
    }

    @Test
    void listFallsBackToNormalizedIndicator() {
        stubList(dispute(" "));
        assertThat(service().getMyDisputes(7L, new DisputeListRequest()).getData().getFirst()
                .indicator().displayValue()).isEqualTo("0987654321");
    }

    @Test
    void emptyListDoesNotQueryAttachments() {
        when(disputes.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());
        assertThat(service().getMyDisputes(7L, new DisputeListRequest()).getData()).isEmpty();
        verifyNoInteractions(evidence, storage);
    }

    @Test
    void privateAttachmentUsesSignedUrl() {
        stubList(dispute("Phone"));
        var file = file();
        when(file.getStorageObjectKey()).thenReturn("disputes/private.pdf");
        when(storage.createDisputeDownloadUrl("disputes/private.pdf")).thenReturn("https://signed.example/private");
        when(evidence.findFilesForDisputes(List.of(41L))).thenReturn(List.of(file));
        var item = service().getMyDisputes(7L, new DisputeListRequest()).getData().getFirst();
        assertThat(item.evidenceCount()).isEqualTo(1);
        assertThat(item.attachments().getFirst().fileUrl()).isEqualTo("https://signed.example/private");
        assertThat(item.attachments().getFirst().fileName()).isEqualTo("proof.pdf");
    }

    @Test
    void legacyAttachmentKeepsStoredUrl() {
        stubList(dispute("Phone"));
        var file = file();
        when(file.getFileUrl()).thenReturn("https://legacy.example/proof.pdf");
        when(evidence.findFilesForDisputes(List.of(41L))).thenReturn(List.of(file));
        assertThat(service().getMyDisputes(7L, new DisputeListRequest()).getData().getFirst()
                .attachments().getFirst().fileUrl()).isEqualTo("https://legacy.example/proof.pdf");
        verifyNoInteractions(storage);
    }

    @Test
    void listRejectsDraftFilter() {
        var filter = new DisputeListRequest();
        filter.setStatus(List.of(DisputeStatus.DRAFT));
        assertThatThrownBy(() -> service().getMyDisputes(7L, filter)).isInstanceOf(BadRequestException.class)
                .hasMessageContaining("/api/disputes/drafts");
        verifyNoInteractions(disputes, evidence, storage);
    }

    @Test
    void paginationUsesRequestedPageAndStableNewestFirstOrder() {
        when(disputes.findAll(any(Specification.class), any(Pageable.class)))
                .thenAnswer(call -> Page.empty(call.getArgument(1)));
        var filter = new DisputeListRequest();
        filter.setPage(2);
        filter.setSize(5);
        var response = service().getMyDisputes(7L, filter);
        var captor = ArgumentCaptor.forClass(Pageable.class);
        verify(disputes).findAll(any(Specification.class), captor.capture());
        var page = captor.getValue();
        assertThat(page.getPageNumber()).isEqualTo(2);
        assertThat(page.getPageSize()).isEqualTo(5);
        assertThat(page.getSort().getOrderFor("createdAt").isDescending()).isTrue();
        assertThat(page.getSort().getOrderFor("id").isDescending()).isTrue();
        assertThat(response.getCurrentPage()).isEqualTo(2);
    }

    @Test
    void summaryCalculatesCountsRateAndHours() {
        when(disputes.countStatuses(7L)).thenReturn(List.of(count(DisputeStatus.PENDING, 2),
                count(DisputeStatus.IN_REVIEW, 1), count(DisputeStatus.NEEDS_MORE_INFO, 1),
                count(DisputeStatus.APPROVED, 2), count(DisputeStatus.REJECTED, 1)));
        when(disputes.averageResolutionSeconds(eq(7L), any(), any())).thenReturn(5400.0);
        var result = service().getMySummary(7L);
        assertThat(result.totalSubmitted()).isEqualTo(7);
        assertThat(result.pending()).isEqualTo(2);
        assertThat(result.inReview()).isEqualTo(1);
        assertThat(result.needsMoreInfo()).isEqualTo(1);
        assertThat(result.approved()).isEqualTo(2);
        assertThat(result.rejected()).isEqualTo(1);
        assertThat(result.restorationRate()).isEqualByComparingTo("66.7");
        assertThat(result.averageResolutionHours()).isEqualByComparingTo("1.5");
        assertThat(result.timezone()).isEqualTo("Asia/Ho_Chi_Minh");
        assertThat(result.generatedAt()).hasHour(15);
    }

    @Test
    void emptySummaryKeepsRatesNull() {
        when(disputes.averageResolutionSeconds(eq(7L), any(), any())).thenReturn(null);
        var result = service().getMySummary(7L);
        assertThat(result.totalSubmitted()).isZero();
        assertThat(result.restorationRate()).isNull();
        assertThat(result.averageResolutionHours()).isNull();
    }

    @Test
    void pendingOnlySummaryHasNoRestorationRate() {
        when(disputes.averageResolutionSeconds(eq(7L), any(), any())).thenReturn(null);
        when(disputes.countStatuses(7L)).thenReturn(List.of(count(DisputeStatus.PENDING, 3)));
        var result = service().getMySummary(7L);
        assertThat(result.totalSubmitted()).isEqualTo(3);
        assertThat(result.pending()).isEqualTo(3);
        assertThat(result.restorationRate()).isNull();
        assertThat(result.averageResolutionHours()).isNull();
    }

    private Dispute dispute(String display) {
        var indicator = Indicator.builder().id(10L).type(IndicatorType.PHONE)
                .normalizedValue("0987654321").displayValue(display).build();
        return Dispute.builder().id(41L).status(DisputeStatus.PENDING).reason("Ownership evidence provided")
                .confirmedIndicator(ConfirmedIndicator.builder().indicator(indicator)
                        .status(ConfirmedIndicatorStatus.ACTIVE).build()).build();
    }

    private void stubList(Dispute dispute) {
        when(disputes.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dispute)));
    }

    private DisputeEvidenceRepository.FileEvidence file() {
        var file = mock(DisputeEvidenceRepository.FileEvidence.class);
        when(file.getDisputeId()).thenReturn(41L);
        when(file.getFileName()).thenReturn("proof.pdf");
        return file;
    }

    private DisputeRepository.StatusCount count(DisputeStatus status, long total) {
        return new DisputeRepository.StatusCount() {
            public DisputeStatus getStatus() { return status; }
            public Long getTotal() { return total; }
        };
    }
}
