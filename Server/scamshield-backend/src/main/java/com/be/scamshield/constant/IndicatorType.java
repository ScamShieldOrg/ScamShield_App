package com.be.scamshield.constant;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/** Các loại Indicator, lưu trong database bằng tên enum. */
public enum IndicatorType {
    PHONE, BANK_ACCOUNT, URL;

    /** Chuẩn hóa loại đối tượng tại đầu vào trước khi chuyển sang enum. */
    public static Optional<IndicatorType> fromStoredValue(String value) {
        if (value == null || value.isBlank()) return Optional.empty();
        String normalized = value.strip().toUpperCase(Locale.ROOT);
        return Arrays.stream(values()).filter(type -> type.name().equals(normalized)).findFirst();
    }

    public boolean matches(String value) {
        return fromStoredValue(value).filter(type -> type == this).isPresent();
    }
}
