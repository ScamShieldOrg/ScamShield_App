package com.be.scamshield.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserDetailResponse {

    private Long id;
    private String userCode;
    private String fullName;
    private String email;
    private String phoneNumber;
    @com.fasterxml.jackson.annotation.JsonProperty("isPhoneVerified")
    private Boolean isPhoneVerified;
    private String role;
    private String roleLabel;
    private String status;
    private String statusLabel;
    private Integer reputationPoints;
    private String reputationRank;
    private LocalDateTime joinedAt;
    private String joinedFormatted;
    private LocalDateTime lastLoginAt;
    private long reportCount;
    @com.fasterxml.jackson.annotation.JsonProperty("isFlagged")
    private boolean isFlagged;
    @com.fasterxml.jackson.annotation.JsonProperty("isRateLimited")
    private boolean isRateLimited;
    private List<AdminAbuseFlagResponse> abuseFlags;

}
