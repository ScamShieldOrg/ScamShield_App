package com.be.scamshield.service;

import com.be.scamshield.dto.response.GuestQuotaResponse;
import jakarta.servlet.http.HttpServletRequest;

public interface IQuotaService {

    GuestQuotaResponse getGuestQuota(String sessionToken, HttpServletRequest httpRequest);

    default GuestQuotaResponse getGuestQuota(String sessionToken) {
        return getGuestQuota(sessionToken, null);
    }
}
