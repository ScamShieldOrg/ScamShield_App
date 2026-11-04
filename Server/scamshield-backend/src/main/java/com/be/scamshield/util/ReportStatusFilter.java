package com.be.scamshield.util;

import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.exception.BadRequestException;
import java.util.Locale;

public final class ReportStatusFilter {
    private ReportStatusFilter() { }

    public static ReportStatus parse(String value) {
        if (value == null || value.isBlank() || "ALL".equalsIgnoreCase(value.strip())) return null;
        try {
            return ReportStatus.valueOf(value.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Trạng thái báo cáo phải là ALL, PENDING, IN_REVIEW, APPROVED, REJECTED hoặc WITHDRAWN");
        }
    }
}
