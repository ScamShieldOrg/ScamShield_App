package com.be.scamshield.service;

import com.be.scamshield.dto.response.ScamCheckHistoryResponse;
import com.be.scamshield.dto.response.ScamCheckRiskCountsResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface IScamCheckHistoryService {

    ScamCheckHistoryResponse getCheckHistory(
            Long userId,
            String search,
            String timeRange,
            String scamType,
            String riskStatus,
            Pageable pageable);

    ScamCheckRiskCountsResponse getRiskCounts(Long userId);

    void deleteHistoryItems(Long userId, List<Long> ids);
}
