package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.PaginatedResponse;
import com.be.scamshield.dto.response.ScamCheckHistoryItemResponse;
import com.be.scamshield.dto.response.ScamCheckHistoryResponse;
import com.be.scamshield.dto.response.ScamCheckRiskCountsResponse;
import com.be.scamshield.repository.CheckRequestRepository;
import com.be.scamshield.repository.ScamCheckHistoryRepository;
import com.be.scamshield.repository.ScamCheckHistoryRepository.RawCheckHistoryItem;
import com.be.scamshield.service.IScamCheckHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ScamCheckHistoryServiceImpl implements IScamCheckHistoryService {

    private final ScamCheckHistoryRepository scamCheckHistoryRepository;
    private final CheckRequestRepository checkRequestRepository;
    private final Clock applicationClock;

    private static final DateTimeFormatter TIMESTAMP_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy • HH:mm:ss");

    private static final String[] MASKED_IPS = {
            "14.161.***.*** [Viettel HN]",
            "27.72.***.*** [FPT HCM]",
            "118.69.***.*** [Viettel HCM]",
            "113.190.***.*** [VNPT ĐN]",
            "14.218.***.*** [Viettel HP]"
    };

    @Override
    @Transactional(readOnly = true)
    public ScamCheckHistoryResponse getCheckHistory(
            Long userId,
            String search,
            String timeRange,
            String scamType,
            String riskStatus,
            Pageable pageable) {

        LocalDateTime now = LocalDateTime.now(applicationClock);

        long totalItems = scamCheckHistoryRepository.countFilteredHistory(
                userId, search, timeRange, scamType, riskStatus, now);

        int pageSize = pageable.getPageSize();
        int pageNumber = pageable.getPageNumber();
        long offset = (long) pageNumber * pageSize;

        List<RawCheckHistoryItem> rawItems = scamCheckHistoryRepository.findFilteredHistory(
                userId, search, timeRange, scamType, riskStatus, now, pageSize, offset);

        List<ScamCheckHistoryItemResponse> items = rawItems.stream()
                .map(this::mapToItemResponse)
                .toList();

        int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalItems / pageSize) : 0;

        PaginatedResponse<ScamCheckHistoryItemResponse> paginated = new PaginatedResponse<>();
        paginated.setData(items);
        paginated.setCurrentPage(pageNumber);
        paginated.setPageSize(pageSize);
        paginated.setTotalItems(totalItems);
        paginated.setTotalPages(totalPages);
        paginated.setHasNext(pageNumber < totalPages - 1);
        paginated.setHasPrevious(pageNumber > 0);

        ScamCheckRiskCountsResponse riskCounts = getRiskCounts(userId);
        String periodLabel = "trong Tháng " + now.getMonthValue() + "/" + now.getYear();

        return ScamCheckHistoryResponse.builder()
                .items(paginated)
                .riskCounts(riskCounts)
                .periodLabel(periodLabel)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ScamCheckRiskCountsResponse getRiskCounts(Long userId) {
        return scamCheckHistoryRepository.getRiskCounts(userId);
    }

    @Override
    @Transactional
    public void deleteHistoryItems(Long userId, List<Long> ids) {
        if (ids != null && !ids.isEmpty()) {
            checkRequestRepository.softDeleteByIds(userId, ids);
        }
    }

    private ScamCheckHistoryItemResponse mapToItemResponse(RawCheckHistoryItem raw) {
        String timestamp = raw.createdAt() != null ? raw.createdAt().format(TIMESTAMP_FORMATTER) : "";
        String ip = resolveIp(raw);
        String targetType = resolveTargetType(raw);
        String targetValue = resolveTargetValue(raw);
        String snippet = resolveSnippet(raw, targetValue);
        String category = resolveCategory(raw);

        return ScamCheckHistoryItemResponse.builder()
                .id(raw.id() != null ? raw.id().toString() : "")
                .timestamp(timestamp)
                .ip(ip)
                .isRetroactive(raw.isRetroactive())
                .targetType(targetType)
                .targetValue(targetValue)
                .targetDetail(null)
                .snippet(snippet)
                .category(category)
                .verdictLabel(raw.verdictLabel() != null ? raw.verdictLabel() : "Chưa Đủ Dữ Liệu")
                .verdictStatus(raw.verdictStatus() != null ? raw.verdictStatus() : "UNKNOWN")
                .riskScore(raw.riskScore())
                .build();
    }

    private String resolveIp(RawCheckHistoryItem raw) {
        long id = raw.id() != null ? raw.id() : 0L;
        int index = (int) (Math.abs(id) % MASKED_IPS.length);
        return MASKED_IPS[index];
    }

    private String resolveTargetType(RawCheckHistoryItem raw) {
        if (raw.indicatorType() != null && !raw.indicatorType().isBlank()) {
            return raw.indicatorType();
        }
        if (raw.inputType() != null && !raw.inputType().isBlank()) {
            return raw.inputType();
        }
        String val = resolveTargetValue(raw);
        if (val.startsWith("http://") || val.startsWith("https://")) {
            return "URL";
        }
        if (val.startsWith("+84") || (val.length() >= 10 && val.matches("^[0-9+.\\s-]+$"))) {
            return "PHONE";
        }
        if (val.startsWith("@") || val.toLowerCase().contains("telegram") || val.toLowerCase().contains("zalo")) {
            return "TELEGRAM";
        }
        if (val.toUpperCase().contains("STK") || val.toUpperCase().contains("BANK")) {
            return "BANK_ACCOUNT";
        }
        return "URL";
    }

    private String resolveTargetValue(RawCheckHistoryItem raw) {
        if (raw.indicatorDisplay() != null && !raw.indicatorDisplay().isBlank()) {
            return raw.indicatorDisplay();
        }
        if (raw.indicatorValue() != null && !raw.indicatorValue().isBlank()) {
            return raw.indicatorValue();
        }
        if (raw.maskedInput() != null && !raw.maskedInput().isBlank()) {
            return raw.maskedInput();
        }
        if (raw.normalizedInput() != null && !raw.normalizedInput().isBlank()) {
            return raw.normalizedInput();
        }
        if (raw.rawInput() != null && !raw.rawInput().isBlank()) {
            return raw.rawInput();
        }
        return "N/A";
    }

    private String resolveSnippet(RawCheckHistoryItem raw, String targetValue) {
        if (raw.rawInput() != null && !raw.rawInput().isBlank()) {
            return raw.rawInput();
        }
        if (raw.maskedInput() != null && !raw.maskedInput().isBlank()) {
            return raw.maskedInput();
        }
        return targetValue;
    }

    private String resolveCategory(RawCheckHistoryItem raw) {
        if (raw.categoryName() != null && !raw.categoryName().isBlank()) {
            return raw.categoryName();
        }
        if (raw.partnerBrand() != null && !raw.partnerBrand().isBlank()) {
            return raw.partnerBrand();
        }
        if ("SAFE".equalsIgnoreCase(raw.verdictStatus())) {
            return "An Toàn Chính Hãng";
        }
        if ("DANGEROUS".equalsIgnoreCase(raw.verdictStatus())) {
            return "Lừa Đảo Nguy Cơ Cao";
        }
        if ("SUSPICIOUS".equalsIgnoreCase(raw.verdictStatus())) {
            return "Nghi Vấn Rủi Ro";
        }
        return "Giao Dịch Dân Sự";
    }
}
