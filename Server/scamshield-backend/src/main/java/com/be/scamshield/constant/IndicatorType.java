package com.be.scamshield.constant;

import java.util.Arrays;
import java.util.Locale;
import java.util.Optional;

/** Ba loại Indicator được hệ thống chấp nhận. Entity vẫn lưu String. */
public enum IndicatorType {
    PHONE, BANK_ACCOUNT, URL;

    /** Không tự ánh xạ hoặc ghi đè giá trị cũ của entity. */
    public static Optional<IndicatorType> fromStoredValue(String value) {
        if (value == null || value.isBlank()) return Optional.empty();
        String normalized = value.strip().toUpperCase(Locale.ROOT);
        return Arrays.stream(values()).filter(type -> type.name().equals(normalized)).findFirst();
    }

    public boolean matches(String value) {
        return fromStoredValue(value).filter(type -> type == this).isPresent();
    }
}
