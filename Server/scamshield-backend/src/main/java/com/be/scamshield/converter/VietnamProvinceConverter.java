package com.be.scamshield.converter;

import com.be.scamshield.constant.VietnamProvince;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Keeps province codes stable in storage while the entity uses a typed province. */
@Converter
public class VietnamProvinceConverter implements AttributeConverter<VietnamProvince, String> {
    @Override
    public String convertToDatabaseColumn(VietnamProvince province) {
        return province == null ? null : province.getCode();
    }

    @Override
    public VietnamProvince convertToEntityAttribute(String code) {
        if (code == null) return null;
        return VietnamProvince.fromCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Mã tỉnh/thành không hợp lệ: " + code));
    }
}
