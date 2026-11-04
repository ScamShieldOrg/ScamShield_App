package com.be.scamshield.exception;

import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ActivityStatus;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.MatchResult;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import java.util.ArrayList;
import java.util.List;
import lombok.Getter;

@Getter
public class PartnerBusinessVerificationException extends RuntimeException {
    private final PartnerBusinessVerificationResponse verification;
    private final int httpStatus;

    public PartnerBusinessVerificationException(PartnerBusinessVerificationResponse verification) {
        super(messageFor(verification));
        this.verification = verification;
        this.httpStatus = unavailable(verification) ? 503 : 422;
    }

    private static boolean unavailable(PartnerBusinessVerificationResponse result) {
        return isUnavailable(result.xinvoice().status())
                || result.documents().stream().anyMatch(document -> isUnavailable(document.status()));
    }

    private static boolean isUnavailable(SourceStatus status) {
        return status == SourceStatus.UNAVAILABLE || status == SourceStatus.NOT_CONFIGURED;
    }

    private static String messageFor(PartnerBusinessVerificationResponse result) {
        List<String> reasons = new ArrayList<>();
        if (isUnavailable(result.xinvoice().status())) {
            reasons.add("Chưa thể tra cứu doanh nghiệp từ XinVoice; vui lòng thử lại sau");
        } else if (result.xinvoice().status() == SourceStatus.NOT_FOUND) {
            reasons.add("Không tìm thấy doanh nghiệp theo mã số thuế đã nhập; vui lòng kiểm tra lại");
        } else {
            if (result.formNameVsXinvoice() == MatchResult.MISMATCH) {
                reasons.add("Tên doanh nghiệp đã nhập không khớp với XinVoice");
            }
            if (result.formTaxCodeVsXinvoice() != MatchResult.MATCHED) {
                reasons.add("Mã số thuế đã nhập chưa khớp với XinVoice");
            }
            if (result.xinvoice().activityStatus() != ActivityStatus.ACTIVE) {
                reasons.add("Trạng thái doanh nghiệp trên XinVoice chưa đáp ứng điều kiện đang hoạt động; vui lòng kiểm tra lại");
            }
        }
        for (var document : result.documents()) {
            if (document.status() == SourceStatus.NOT_CHECKED || document.status() == SourceStatus.DISABLED) { continue; }
            String prefix = "Tài liệu " + document.fileName() + ": ";
            if (isUnavailable(document.status())) {
                reasons.add(prefix + "dịch vụ OCR chưa sẵn sàng; vui lòng thử lại sau");
            } else if (document.status() != SourceStatus.SUCCESS) {
                reasons.add(prefix + "chưa đọc được thông tin; vui lòng tải PDF rõ và đầy đủ nội dung");
            } else {
                if (document.formNameVsOcr() != MatchResult.MATCHED) {
                    reasons.add(prefix + (document.formNameVsOcr() == MatchResult.MISMATCH
                            ? "tên doanh nghiệp không khớp với thông tin đã nhập"
                            : "chưa đọc đủ rõ tên doanh nghiệp; vui lòng tải lại PDF"));
                }
                if (document.formTaxCodeVsOcr() != MatchResult.MATCHED) {
                    reasons.add(prefix + (document.formTaxCodeVsOcr() == MatchResult.MISMATCH
                            ? "mã số thuế không khớp với thông tin đã nhập"
                            : "chưa đọc đủ rõ mã số thuế; vui lòng tải lại PDF"));
                }
            }
        }
        if (reasons.isEmpty()) { reasons.add("Chưa đủ thông tin để đối soát doanh nghiệp; vui lòng kiểm tra tên, mã số thuế và PDF"); }
        return String.join(". ", reasons);
    }
}
