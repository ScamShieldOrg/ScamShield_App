package com.be.scamshield.service;

import com.be.scamshield.dto.admin.*;

import java.util.List;

public interface IAdminUserService {

    AdminUserListResponse getUsers(
            String search,
            String role,
            String status,
            int page,
            int size,
            String sortBy,
            String sortDir
    );

    AdminUserDetailResponse getUserDetail(Long userId);

    AdminUserItemResponse updateUserRole(Long userId, AdminUpdateRoleRequest request, String currentAdminUsername);

    AdminUserItemResponse updateUserStatus(Long userId, AdminUpdateStatusRequest request, String currentAdminUsername);

    AdminAbuseFlagResponse createAbuseFlag(Long userId, AdminCreateFlagRequest request, String currentAdminUsername);

    AdminAbuseFlagResponse resolveAbuseFlag(Long userId, Long flagId, String currentAdminUsername);

    List<AdminRoleOptionResponse> getAvailableRoles();

}
