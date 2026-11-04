package com.be.scamshield.service;

import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.dto.response.ScamCheckResponse;
import com.be.scamshield.dto.response.UserScamCheckQuotaResponse;

public interface IScamCheckService {
    ScamCheckResponse check(ScamCheckRequest request, Long userId, String guestToken);

    ScamCheckResponse getResult(Long checkId, Long userId, String guestToken);

    UserScamCheckQuotaResponse getUserQuota(Long userId);
}
