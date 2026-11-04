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
public class AdminUserItemResponse {

    private Long id;
    private String userCode;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String role;
    private String roleLabel;
    private LocalDateTime joinedAt;
    private String joinedFormatted;
    private long reportCount;
    private String status;
    private String statusLabel;
    @com.fasterxml.jackson.annotation.JsonProperty("isFlagged")
    private boolean isFlagged;

    @com.fasterxml.jackson.annotation.JsonProperty("isRateLimited")
    private boolean isRateLimited;

    private List<String> flagReasons;

}
