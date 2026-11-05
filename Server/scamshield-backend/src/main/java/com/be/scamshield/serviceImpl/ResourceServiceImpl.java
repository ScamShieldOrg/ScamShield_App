package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.request.BlacklistResourceFilterRequest;
import com.be.scamshield.dto.request.WhitelistResourceFilterRequest;
import com.be.scamshield.dto.response.BlacklistResourceResponse;
import com.be.scamshield.dto.response.WhitelistResourceResponse;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.repository.ResourceRepository;
import com.be.scamshield.repository.ResourceRepository.BlacklistResourceProjection;
import com.be.scamshield.repository.WhitelistResourceRepository;
import com.be.scamshield.service.IResourceService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ResourceServiceImpl implements IResourceService {
    private final ResourceRepository resourceRepository;
    private final WhitelistResourceRepository whitelistResourceRepository;

    @Override
    public PaginatedResponse<BlacklistResourceResponse> getBlackListResources(BlacklistResourceFilterRequest filter) {
        Page<BlacklistResourceResponse> page = resourceRepository.findBlackListResources(
                keyword(filter.getKeyword()),
                StringUtils.hasText(filter.getResourceType()) ? filter.getResourceType().trim() : null,
                PageRequest.of(filter.getPage(), filter.getSize())
        ).map(this::toResponse);
        return PaginatedResponse.buildPaginatedResponse(page);
    }

    @Override
    public PaginatedResponse<WhitelistResourceResponse> getWhiteListResources(WhitelistResourceFilterRequest filter) {
        Page<PartnerProfile> partners = whitelistResourceRepository.findVerifiedPartners(
                PartnerVerificationStatus.VERIFIED, keyword(filter.getKeyword()), filter.getSortBy(),
                PageRequest.of(filter.getPage(), filter.getSize()));
        if (partners.isEmpty()) {
            return PaginatedResponse.buildPaginatedResponse(partners.map(this::toWhitelistResponse));
        }
        List<Long> ids = partners.getContent().stream().map(PartnerProfile::getId).toList();
        Map<Long, List<WhitelistEntry>> entries = whitelistResourceRepository.findVerifiedEntries(ids).stream()
                .collect(Collectors.groupingBy(entry -> entry.getPartner().getId()));
        return PaginatedResponse.buildPaginatedResponse(partners.map(partner ->
                toWhitelistResponse(partner, entries.getOrDefault(partner.getId(), List.of()))));
    }

    private WhitelistResourceResponse toWhitelistResponse(PartnerProfile partner) {
        return toWhitelistResponse(partner, List.of());
    }

    private WhitelistResourceResponse toWhitelistResponse(PartnerProfile partner, List<WhitelistEntry> entries) {
        return WhitelistResourceResponse.builder()
                .id(partner.getId())
                .name(partner.getLegalName())
                .brandName(partner.getBrandName())
                .taxId(partner.getTaxCode())
                .representativeNameAndTitle(partner.getRepresentativeNameAndTitle())
                .officialHotlines(singleValue(partner.getOfficialHotline()))
                .officialDomains(singleValue(partner.getOfficialDomain()))
                .smsBrandNames(singleValue(partner.getSmsBrandName()))
                .verifiedIndicators(entries.stream().map(entry -> WhitelistResourceResponse.VerifiedIndicator.builder()
                        .id(entry.getId())
                        .resourceType(entry.getIndicator().getType().name())
                        .value(indicatorValue(entry))
                        .verifiedAt(entry.getVerifiedAt())
                        .build()).toList())
                .verifiedAt(partner.getVerifiedAt())
                .build();
    }

    private List<String> singleValue(String value) {
        return StringUtils.hasText(value) ? List.of(value) : List.of();
    }

    private String indicatorValue(WhitelistEntry entry) {
        return StringUtils.hasText(entry.getIndicator().getDisplayValue())
                ? entry.getIndicator().getDisplayValue() : entry.getIndicator().getNormalizedValue();
    }

    private BlacklistResourceResponse toResponse(BlacklistResourceProjection row) {
        Severity severity = Severity.fromWarningCount(row.getWarningCount());
        return BlacklistResourceResponse.builder()
                .id(row.getId())
                .indicatorId(row.getIndicatorId())
                .resourceType(row.getResourceType())
                .title(row.getTitle())
                .severity(severity.name())
                .severityLabel(severity.label)
                .description(StringUtils.hasText(row.getDescription())
                        ? row.getDescription()
                        : "ScamShield confirmed this resource as unsafe.")
                .warningCount(row.getWarningCount())
                .confirmedAt(row.getConfirmedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }


    private String keyword(String value) {
        return StringUtils.hasText(value) ? "%" + value.trim().toLowerCase(Locale.ROOT) + "%" : null;
    }

    private enum Severity {
        CRITICAL("CỰC KỲ NGUY HIỂM"),
        URGENT("KHẨN CẤP"),
        HIGH("RỦI RO CAO"),
        DANGEROUS("NGUY HIỂM");

        private final String label;

        Severity(String label) {
            this.label = label;
        }

        private static Severity fromWarningCount(Long warningCount) {
            long count = warningCount == null ? 0 : warningCount;
            if (count >= 1_000) return CRITICAL;
            if (count >= 500) return URGENT;
            if (count >= 100) return HIGH;
            return DANGEROUS;
        }
    }
}
