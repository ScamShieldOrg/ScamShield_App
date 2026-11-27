package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.dto.request.BlacklistResourceFilterRequest;
import com.be.scamshield.dto.request.WhitelistResourceFilterRequest;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.external.SupabaseStorageService;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.repository.ResourceRepository;
import com.be.scamshield.repository.ResourceRepository.BlacklistResourceProjection;
import com.be.scamshield.repository.WhitelistResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ResourceServiceImplTest {
    private ResourceRepository resourceRepository;
    private WhitelistResourceRepository whitelistRepository;
    private ResourceServiceImpl service;
    private SupabaseStorageService evidenceStorage;

    @BeforeEach
    void setUp() {
        resourceRepository = mock(ResourceRepository.class);
        whitelistRepository = mock(WhitelistResourceRepository.class);
        evidenceStorage = mock(SupabaseStorageService.class);
        service = new ResourceServiceImpl(resourceRepository, whitelistRepository, evidenceStorage);
    }

    @Test
    void blacklistOnlySignsAnImageWhenAnActiveEntryHasAnApprovedPublicationKey() {
        when(resourceRepository.findBlackListImageKey(4L)).thenReturn(Optional.of("published-reports/sample.jpg"));
        when(evidenceStorage.createReportPublicationImageUrl("published-reports/sample.jpg"))
                .thenReturn("https://example.test/signed.jpg");

        assertThat(service.getBlackListImageUrl(4L)).isEqualTo("https://example.test/signed.jpg");
    }

    @Test
    void blacklistDoesNotReturnAnImageWhenNoPublicationKeyIsEligible() {
        assertThatThrownBy(() -> service.getBlackListImageUrl(4L))
                .isInstanceOf(ResourceNotFoundException.class);
        verifyNoInteractions(evidenceStorage);
    }

    @Test
    void blacklistReturnsMetadataAndOtherImagesWhenOneImageCannotBeSigned() {
        var filter = new BlacklistResourceFilterRequest();
        var row = mock(BlacklistResourceProjection.class);
        when(row.getId()).thenReturn(4L);
        when(row.getSourceReportId()).thenReturn(12L);
        when(resourceRepository.findBlackListResources(null, null, PageRequest.of(filter.getPage(), filter.getSize())))
                .thenReturn(new PageImpl<>(List.of(row)));
        var unavailable = mock(ResourceRepository.PublicEvidenceRow.class);
        when(unavailable.getBlacklistId()).thenReturn(4L);
        when(unavailable.getObjectKey()).thenReturn("unavailable.jpg");
        var available = mock(ResourceRepository.PublicEvidenceRow.class);
        when(available.getBlacklistId()).thenReturn(4L);
        when(available.getObjectKey()).thenReturn("available.jpg");
        when(resourceRepository.findPublicEvidenceForBlacklistIds(List.of(4L))).thenReturn(List.of(unavailable, available));
        when(evidenceStorage.createReportPublicationImageUrl("unavailable.jpg"))
                .thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));
        when(evidenceStorage.createReportPublicationImageUrl("available.jpg"))
                .thenReturn("https://example.test/signed.jpg");

        assertThat(service.getBlackListResources(filter).getData()).singleElement().satisfies(item -> {
            assertThat(item.getId()).isEqualTo(4L);
            assertThat(item.getSourceReport().getId()).isEqualTo(12L);
            assertThat(item.getSourceReport().getPublicEvidenceUrls()).containsExactly("https://example.test/signed.jpg");
        });
    }

    @Test
    void blacklistNormalizesFiltersAndMapsSeverityAndPagination() {
        var filter = new BlacklistResourceFilterRequest();
        filter.setPage(1);
        filter.setSize(2);
        filter.setKeyword("  SCAM  ");
        filter.setResourceType(" PHONE ");
        var row = mock(BlacklistResourceProjection.class);
        when(row.getId()).thenReturn(4L);
        when(row.getTitle()).thenReturn("Scam number");
        when(row.getWarningCount()).thenReturn(500L);
        when(row.getPublicImageCount()).thenReturn(1L);
        when(resourceRepository.findBlackListResources("%scam%", "PHONE", PageRequest.of(1, 2)))
                .thenReturn(new PageImpl<>(List.of(row), PageRequest.of(1, 2), 5));

        var result = service.getBlackListResources(filter);

        assertThat(result.getCurrentPage()).isEqualTo(1);
        assertThat(result.getTotalItems()).isEqualTo(5);
        assertThat(result.isHasNext()).isTrue();
        assertThat(result.getData()).singleElement().satisfies(item -> {
            assertThat(item.getTitle()).isEqualTo("Scam number");
            assertThat(item.isHasPublicImage()).isTrue();
            assertThat(item.getSeverity()).isEqualTo("URGENT");
            assertThat(item.getDescription()).isEqualTo("ScamShield confirmed this resource as unsafe.");
        });
        verifyNoInteractions(whitelistRepository);
    }

    @Test
    void blacklistReturnsCategoryAndUsesItsDescriptionWhenPublicReasonIsBlank() {
        var filter = new BlacklistResourceFilterRequest();
        var categorizedRow = mock(BlacklistResourceProjection.class);
        var confirmedRow = mock(BlacklistResourceProjection.class);
        when(categorizedRow.getCategoryCode()).thenReturn("IMPERSONATION");
        when(categorizedRow.getCategoryName()).thenReturn("Giả danh");
        when(categorizedRow.getCategoryDescription()).thenReturn("Giả danh để yêu cầu chuyển tiền.");
        when(categorizedRow.getDescription()).thenReturn(" ");
        when(confirmedRow.getCategoryDescription()).thenReturn("Mô tả chung.");
        when(confirmedRow.getDescription()).thenReturn("Lý do công khai đã xác minh.");
        when(resourceRepository.findBlackListResources(eq(null), eq(null), eq(PageRequest.of(filter.getPage(), filter.getSize()))))
                .thenReturn(new PageImpl<>(List.of(categorizedRow, confirmedRow)));

        var items = service.getBlackListResources(filter).getData();

        assertThat(items.get(0).getCategoryCode()).isEqualTo("IMPERSONATION");
        assertThat(items.get(0).getCategoryName()).isEqualTo("Giả danh");
        assertThat(items.get(0).getCategoryDescription()).isEqualTo("Giả danh để yêu cầu chuyển tiền.");
        assertThat(items.get(0).getDescription()).isEqualTo("Giả danh để yêu cầu chuyển tiền.");
        assertThat(items.get(1).getDescription()).isEqualTo("Lý do công khai đã xác minh.");
    }

    @Test
    void whitelistGroupsVerifiedEntriesByPartnerWithoutLosingPagination() {
        var filter = new WhitelistResourceFilterRequest();
        filter.setPage(1);
        filter.setSize(2);
        filter.setKeyword("  VIETTEL  ");
        filter.setSortBy("name");
        var first = partner(10L, "Viettel");
        first.setVerificationReason("Đã đối soát pháp nhân và tên miền");
        var second = partner(20L, "Vietcombank");
        second.setOfficialHotline(null);
        second.setOfficialDomain(null);
        second.setSmsBrandName(null);
        var pageRequest = PageRequest.of(1, 2);
        when(whitelistRepository.findVerifiedPartners(PartnerVerificationStatus.VERIFIED,
                "%viettel%", "name", pageRequest))
                .thenReturn(new PageImpl<>(List.of(first, second), pageRequest, 5));
        when(whitelistRepository.findVerifiedEntries(List.of(10L, 20L)))
                .thenReturn(List.of(entry(1L, first, "PHONE", "18008098", null),
                        entry(2L, first, "URL", "viettel.vn", "viettel.vn")));

        var result = service.getWhiteListResources(filter);

        assertThat(result.getCurrentPage()).isEqualTo(1);
        assertThat(result.getTotalItems()).isEqualTo(5);
        assertThat(result.getTotalPages()).isEqualTo(3);
        assertThat(result.getData()).hasSize(2);
        assertThat(result.getData().get(0).getOfficialHotlines()).containsExactly("18008098");
        assertThat(result.getData().get(0).getOfficialDomains()).containsExactly("viettel.vn");
        assertThat(result.getData().get(0).getSmsBrandNames()).containsExactly("VIETTEL");
        assertThat(result.getData().get(0).getVerificationReason()).isEqualTo("Đã đối soát pháp nhân và tên miền");
        assertThat(result.getData().get(0).getVerifiedIndicators()).extracting("value")
                .containsExactly("18008098", "viettel.vn");
        assertThat(result.getData().get(1).getVerifiedIndicators()).isEmpty();
        assertThat(result.getData().get(1).getOfficialHotlines()).isEmpty();
        assertThat(result.getData().get(1).getVerificationReason()).isNull();
        verifyNoInteractions(resourceRepository);
    }

    @Test
    void emptyWhitelistPageDoesNotQueryEntries() {
        var filter = new WhitelistResourceFilterRequest();
        when(whitelistRepository.findVerifiedPartners(eq(PartnerVerificationStatus.VERIFIED),
                eq(null), eq("newest"), eq(PageRequest.of(0, 10))))
                .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        var result = service.getWhiteListResources(filter);

        assertThat(result.getData()).isEmpty();
        assertThat(result.getTotalItems()).isZero();
        verify(whitelistRepository).findVerifiedPartners(PartnerVerificationStatus.VERIFIED,
                null, "newest", PageRequest.of(0, 10));
        verify(whitelistRepository, never()).findVerifiedEntries(anyList());
        verifyNoInteractions(resourceRepository);
    }

    private PartnerProfile partner(Long id, String name) {
        return PartnerProfile.builder()
                .id(id).legalName(name).brandName(name)
                .contactPhone("0912345678")
                .corporateEmail("contact@viettel.vn")
                .officialHotline("18008098")
                .officialDomain("viettel.vn")
                .smsBrandName("VIETTEL")
                .verifiedAt(LocalDateTime.parse("2026-01-15T10:00:00"))
                .build();
    }

    private WhitelistEntry entry(Long id, PartnerProfile partner, String type, String normalized, String display) {
        return WhitelistEntry.builder()
                .id(id).partner(partner)
                .indicator(Indicator.builder().type(IndicatorType.valueOf(type)).normalizedValue(normalized).displayValue(display).build())
                .verifiedAt(LocalDateTime.parse("2026-01-15T10:00:00"))
                .build();
    }
}
