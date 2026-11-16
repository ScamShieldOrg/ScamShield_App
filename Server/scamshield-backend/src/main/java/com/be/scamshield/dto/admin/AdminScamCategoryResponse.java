package com.be.scamshield.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminScamCategoryResponse {
    private Long id;
    private String code;
    private String name;
    private String description;
    private Boolean isActive;
    private Integer version;
    private Long approvedReportCount;
}
