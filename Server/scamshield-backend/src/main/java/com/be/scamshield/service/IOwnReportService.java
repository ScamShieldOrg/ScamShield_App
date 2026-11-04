package com.be.scamshield.service;

import com.be.scamshield.dto.request.UpdateOwnReportRequest;
import com.be.scamshield.dto.response.ReportDetailTrackingResponse;
import com.be.scamshield.security.UserPrincipal;

public interface IOwnReportService {
    ReportDetailTrackingResponse update(Long id, UpdateOwnReportRequest request, UserPrincipal principal);
    void withdraw(Long id, UserPrincipal principal);
}
