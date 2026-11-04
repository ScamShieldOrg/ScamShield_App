package com.be.scamshield.service;

import com.be.scamshield.dto.request.CreateGuestSessionRequest;
import com.be.scamshield.dto.response.GuestSessionResponse;
import com.be.scamshield.entity.GuestSession;
import jakarta.servlet.http.HttpServletRequest;

public interface IGuestSessionService {

    GuestSessionResponse createOrGetSession(CreateGuestSessionRequest request, HttpServletRequest httpRequest);

    GuestSession getValidSession(String sessionToken);

    String resolveClientIp(HttpServletRequest request);
}
