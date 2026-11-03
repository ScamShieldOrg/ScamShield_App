package com.be.scamshield.constant;

import com.be.scamshield.util.ReportStatusFilter;
import com.be.scamshield.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class ReportStatusFilterTest {
    @Test
    void acceptsKnownStatusesAndRejectsRemovedOrUnknownOnes() {
        assertThat(ReportStatusFilter.parse(" approved ")).isEqualTo(ReportStatus.APPROVED);
        assertThat(ReportStatusFilter.parse("ALL")).isNull();
        for (String invalid : new String[] {"APPROVED_BLACKLIST", "MERGED_DUPLICATE", "MERGED", "DELETED", "INVALID"}) {
            assertThatThrownBy(() -> ReportStatusFilter.parse(invalid)).isInstanceOf(BadRequestException.class);
        }
    }
}
