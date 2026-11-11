package com.be.scamshield.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Schema(description = "User profile DTO")
public class UserDto {
    
    @Schema(description = "User ID", example = "1")
    private Long id;

    @Schema(description = "Username", example = "johndoe")
    private String username;

    @Schema(description = "Full name")
    private String fullName;

    @Schema(description = "Email address", example = "johndoe@example.com")
    private String email;

    @Schema(description = "Phone number", example = "+84912345678")
    private String phoneNumber;

    @Schema(description = "Phone number verification status", example = "true")
    private Boolean isPhoneVerified;

    @Schema(description = "Role name", example = "REGISTERED_USER")
    private String role;

    @Schema(description = "Account status", example = "ACTIVE")
    private String status;

    @Schema(description = "Reputation points", example = "100")
    private Integer reputationPoints;

    @Schema(description = "Account creation timestamp")
    private LocalDateTime createdAt;
}
