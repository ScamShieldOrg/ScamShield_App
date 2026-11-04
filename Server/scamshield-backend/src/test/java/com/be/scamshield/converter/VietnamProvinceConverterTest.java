package com.be.scamshield.converter;

import com.be.scamshield.constant.VietnamProvince;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class VietnamProvinceConverterTest {
    private final VietnamProvinceConverter converter = new VietnamProvinceConverter();

    @Test
    void roundTripsEveryProvinceUsingItsExistingDatabaseCode() {
        for (VietnamProvince province : VietnamProvince.values()) {
            assertThat(converter.convertToDatabaseColumn(province)).isEqualTo(province.getCode());
            assertThat(converter.convertToEntityAttribute(province.getCode())).isSameAs(province);
        }
    }

    @Test
    void preservesNullAndRejectsUnknownCodes() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
        assertThatThrownBy(() -> converter.convertToEntityAttribute("99"))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
