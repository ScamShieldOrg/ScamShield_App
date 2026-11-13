package com.be.scamshield.constant;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
class IndicatorTypeTest {
    @Test
    void onlyThreeTypesAreSupported() {
        assertThat(IndicatorType.values()).containsExactly(IndicatorType.PHONE, IndicatorType.BANK_ACCOUNT, IndicatorType.URL);
        assertThat(IndicatorType.fromStoredValue(" phone ")).contains(IndicatorType.PHONE);
        for (String value : new String[] {"WEBSITE", "DOMAIN", "BRANDNAME", "TELEGRAM", "SMS_BANK", "UNKNOWN", ""}) {
            assertThat(IndicatorType.fromStoredValue(value)).isEmpty();
        }
        assertThat(IndicatorType.fromStoredValue(null)).isEmpty();
    }
}
