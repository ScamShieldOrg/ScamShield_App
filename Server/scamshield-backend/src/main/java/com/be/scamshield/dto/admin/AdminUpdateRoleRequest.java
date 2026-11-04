package com.be.scamshield.dto.admin;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminUpdateRoleRequest {

    @NotBlank(message = "Tên vai trò mới không được để trống")
    private String role;

}
