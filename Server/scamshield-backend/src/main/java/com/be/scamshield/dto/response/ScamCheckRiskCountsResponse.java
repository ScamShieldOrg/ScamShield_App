package com.be.scamshield.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScamCheckRiskCountsResponse {
    private long all;
    private long dangerous;
    private long suspicious;
    private long safe;
    private long unknown;
}
