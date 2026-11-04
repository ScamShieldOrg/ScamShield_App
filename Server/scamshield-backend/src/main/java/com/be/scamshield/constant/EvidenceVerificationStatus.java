package com.be.scamshield.constant;

import java.util.Locale;

public enum EvidenceVerificationStatus {
    PENDING,
    VERIFIED,
    REJECTED;

    /** Giá trị cũ không được hỗ trợ trả về null, không suy diễn là đã xác minh. */
    public static EvidenceVerificationStatus fromStoredValue(String value) {
        if (value == null) {
            return null;
        }
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}
