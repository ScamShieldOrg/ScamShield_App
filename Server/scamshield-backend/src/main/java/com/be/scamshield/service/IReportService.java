package com.be.scamshield.service;

import com.be.scamshield.dto.request.CreateReportRequest;
import com.be.scamshield.dto.response.ReportResponse;
import com.be.scamshield.security.UserPrincipal;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface IReportService {
    ReportResponse createReport(CreateReportRequest request, List<MultipartFile> files, UserPrincipal currentUser);
    ReportResponse getReportById(Long id, UserPrincipal currentUser);
    List<ReportResponse> getMyReports(UserPrincipal currentUser);
}
