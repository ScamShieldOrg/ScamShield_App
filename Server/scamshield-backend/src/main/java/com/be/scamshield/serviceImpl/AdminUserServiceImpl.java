package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.admin.*;
import com.be.scamshield.entity.AbuseFlag;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.Role;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.BadRequestException;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.repository.*;
import com.be.scamshield.repository.AdminUserRepository.UserRow;
import com.be.scamshield.service.IAdminUserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserServiceImpl implements IAdminUserService {

    private final AdminUserRepository adminUserRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final AbuseFlagRepository abuseFlagRepository;
    private final AuditLogRepository auditLogRepository;

    private static final DateTimeFormatter MONTH_YEAR_FORMATTER = DateTimeFormatter.ofPattern("MM/yyyy");

    @Override
    @Transactional(readOnly = true)
    public AdminUserListResponse getUsers(
            String search,
            String role,
            String status,
            int page,
            int size,
            String sortBy,
            String sortDir
    ) {
        int safePage = Math.max(1, page);
        int safeSize = Math.max(1, Math.min(size, 100));

        List<UserRow> rows = adminUserRepository.findUsers(
                search, role, status, safePage, safeSize, sortBy, sortDir
        );
        long totalItems = adminUserRepository.countUsers(search, role, status);
        long totalAccounts = adminUserRepository.countTotalAccounts();
        long flaggedAccountsCount = adminUserRepository.countFlaggedAccounts();

        int totalPages = (int) Math.ceil((double) totalItems / safeSize);
        boolean hasNext = safePage < totalPages;
        boolean hasPrevious = safePage > 1;

        List<AdminUserItemResponse> items = rows.stream()
                .map(this::mapToItemResponse)
                .toList();

        return AdminUserListResponse.builder()
                .items(items)
                .totalAccounts(totalAccounts)
                .flaggedAccountsCount(flaggedAccountsCount)
                .currentPage(safePage)
                .pageSize(safeSize)
                .totalItems(totalItems)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .hasPrevious(hasPrevious)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AdminUserDetailResponse getUserDetail(Long userId) {
        UserRow row = adminUserRepository.findUserDetail(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản người dùng với ID: " + userId));

        List<AbuseFlag> flags = abuseFlagRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<AdminAbuseFlagResponse> abuseFlagResponses = flags.stream()
                .map(this::mapToAbuseFlagResponse)
                .toList();

        boolean isFlagged = row.openFlagCount() > 0
                || "SUSPENDED".equalsIgnoreCase(row.status())
                || "BANNED".equalsIgnoreCase(row.status())
                || row.reportCount() >= 500;

        boolean isRateLimited = row.openFlagCount() > 0 || row.reportCount() >= 500;

        return AdminUserDetailResponse.builder()
                .id(row.id())
                .userCode(formatUserCode(row.id()))
                .fullName(row.fullName())
                .email(row.email())
                .phoneNumber(row.phoneNumber())
                .isPhoneVerified(row.isPhoneVerified() != null ? row.isPhoneVerified() : false)
                .role(row.roleName())
                .roleLabel(getRoleLabel(row.roleName()))
                .status(row.status())
                .statusLabel(getStatusLabel(row.status()))
                .reputationPoints(row.reputationPoints() != null ? row.reputationPoints() : 0)
                .reputationRank(row.reputationRankName())
                .joinedAt(row.createdAt())
                .joinedFormatted(row.createdAt() != null ? row.createdAt().format(MONTH_YEAR_FORMATTER) : "")
                .lastLoginAt(row.lastLoginAt())
                .reportCount(row.reportCount())
                .isFlagged(isFlagged)
                .isRateLimited(isRateLimited)
                .abuseFlags(abuseFlagResponses)
                .build();
    }

    @Override
    @Transactional
    public AdminUserItemResponse updateUserRole(Long userId, AdminUpdateRoleRequest request, String currentAdminUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        String targetRole = request.getRole().trim().toUpperCase(Locale.ROOT);
        if (targetRole.startsWith("ROLE_")) {
            targetRole = targetRole.substring(5);
        }

        Role newRole = roleRepository.findByName(targetRole)
                .orElseThrow(() -> new BadRequestException("Vai trò không hợp lệ: " + request.getRole()));

        // Prevent self-demotion from ADMINISTRATOR to prevent accidental lockout
        if (isCurrentAdmin(user, currentAdminUsername)
                && "ADMINISTRATOR".equalsIgnoreCase(user.getRole().getName())
                && !"ADMINISTRATOR".equalsIgnoreCase(newRole.getName())) {
            throw new BadRequestException("Bạn không thể tự hạ cấp vai trò Quản trị viên của chính mình.");
        }

        String previousRole = user.getRole() != null ? user.getRole().getName() : "NONE";
        user.setRole(newRole);
        user.setUpdatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        // Record Audit Log
        recordAuditLog(currentAdminUsername, "UPDATE_ROLE", userId, previousRole, newRole.getName(),
                "Cập nhật vai trò người dùng sang " + newRole.getName());

        log.info("Admin {} changed role for user ID {} from {} to {}", currentAdminUsername, userId, previousRole, newRole.getName());

        return getUserDetailAsItem(savedUser.getId());
    }

    @Override
    @Transactional
    public AdminUserItemResponse updateUserStatus(Long userId, AdminUpdateStatusRequest request, String currentAdminUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        String newStatus = request.getStatus().trim().toUpperCase(Locale.ROOT);
        validateStatus(newStatus);

        // Prevent self-deactivation/lockout
        if (isCurrentAdmin(user, currentAdminUsername) && !"ACTIVE".equalsIgnoreCase(newStatus)) {
            throw new BadRequestException("Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản Quản trị viên của chính mình.");
        }

        String previousStatus = user.getStatus();
        user.setStatus(newStatus);
        user.setUpdatedAt(LocalDateTime.now());
        User savedUser = userRepository.save(user);

        // Record Audit Log
        String reason = request.getReason() != null && !request.getReason().isBlank()
                ? request.getReason()
                : "Cập nhật trạng thái người dùng";
        recordAuditLog(currentAdminUsername, "UPDATE_STATUS", userId, previousStatus, newStatus, reason);

        log.info("Admin {} changed status for user ID {} from {} to {}", currentAdminUsername, userId, previousStatus, newStatus);

        return getUserDetailAsItem(savedUser.getId());
    }

    @Override
    @Transactional
    public AdminAbuseFlagResponse createAbuseFlag(Long userId, AdminCreateFlagRequest request, String currentAdminUsername) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng với ID: " + userId));

        AbuseFlag flag = AbuseFlag.builder()
                .user(user)
                .flagType(request.getFlagType().trim().toUpperCase(Locale.ROOT))
                .severity(request.getSeverity() != null ? request.getSeverity().trim().toUpperCase(Locale.ROOT) : "MEDIUM")
                .reason(request.getReason())
                .evidence(request.getEvidence())
                .status("OPEN")
                .createdAt(LocalDateTime.now())
                .build();

        AbuseFlag savedFlag = abuseFlagRepository.save(flag);

        recordAuditLog(currentAdminUsername, "CREATE_ABUSE_FLAG", userId, null, savedFlag.getFlagType(),
                "Gắn cờ lạm dụng tài khoản: " + savedFlag.getFlagType());

        return mapToAbuseFlagResponse(savedFlag);
    }

    @Override
    @Transactional
    public AdminAbuseFlagResponse resolveAbuseFlag(Long userId, Long flagId, String currentAdminUsername) {
        AbuseFlag flag = abuseFlagRepository.findById(flagId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy cờ lạm dụng với ID: " + flagId));

        if (flag.getUser() == null || !flag.getUser().getId().equals(userId)) {
            throw new BadRequestException("Cờ lạm dụng này không thuộc về tài khoản người dùng ID: " + userId);
        }

        if (!"OPEN".equals(flag.getStatus())) {
            throw new BadRequestException("Chỉ được giải tỏa cờ đang có hiệu lực; hồ sơ chờ duyệt phải được xét duyệt trước");
        }

        flag.setStatus("RESOLVED");
        flag.setResolvedAt(LocalDateTime.now());
        AbuseFlag savedFlag = abuseFlagRepository.save(flag);

        recordAuditLog(currentAdminUsername, "RESOLVE_ABUSE_FLAG", userId, "OPEN", "RESOLVED",
                "Giải tỏa cờ lạm dụng ID: " + flagId);

        return mapToAbuseFlagResponse(savedFlag);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AdminRoleOptionResponse> getAvailableRoles() {
        return List.of(
                AdminRoleOptionResponse.builder()
                        .name("REGISTERED_USER")
                        .label("Người dùng")
                        .description("Người dùng cá nhân đã đăng ký trên hệ thống")
                        .build(),
                AdminRoleOptionResponse.builder()
                        .name("MODERATOR")
                        .label("Kiểm duyệt viên")
                        .description("Quyền thẩm định báo cáo lừa đảo, xử lý khiếu nại và vận hành")
                        .build(),
                AdminRoleOptionResponse.builder()
                        .name("BUSINESS_PARTNER")
                        .label("Đối tác")
                        .description("Đối tác tổ chức, ngân hàng, viễn thông và doanh nghiệp")
                        .build(),
                AdminRoleOptionResponse.builder()
                        .name("ADMINISTRATOR")
                        .label("Quản trị viên")
                        .description("Toàn quyền quản trị hệ thống, tài khoản và cấu hình kỹ thuật")
                        .build()
        );
    }

    private AdminUserItemResponse getUserDetailAsItem(Long userId) {
        UserRow row = adminUserRepository.findUserDetail(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return mapToItemResponse(row);
    }

    private AdminUserItemResponse mapToItemResponse(UserRow row) {
        boolean isFlagged = row.openFlagCount() > 0
                || "SUSPENDED".equalsIgnoreCase(row.status())
                || "BANNED".equalsIgnoreCase(row.status())
                || row.reportCount() >= 500;

        boolean isRateLimited = row.openFlagCount() > 0 || row.reportCount() >= 500;

        List<String> flagReasons = new ArrayList<>();
        if (row.openFlagCount() > 0) {
            flagReasons.add("Tài khoản có " + row.openFlagCount() + " cờ lạm dụng đang mở");
        }
        if (row.reportCount() >= 500) {
            flagReasons.add("Báo cáo số lượng lớn bất thường (" + row.reportCount() + " báo cáo)");
        }
        if ("SUSPENDED".equalsIgnoreCase(row.status())) {
            flagReasons.add("Tài khoản đang bị tạm khóa");
        } else if ("BANNED".equalsIgnoreCase(row.status())) {
            flagReasons.add("Tài khoản đã bị cấm vĩnh viễn");
        }

        return AdminUserItemResponse.builder()
                .id(row.id())
                .userCode(formatUserCode(row.id()))
                .fullName(row.fullName())
                .email(row.email())
                .phoneNumber(row.phoneNumber())
                .role(row.roleName())
                .roleLabel(getRoleLabel(row.roleName()))
                .joinedAt(row.createdAt())
                .joinedFormatted(row.createdAt() != null ? row.createdAt().format(MONTH_YEAR_FORMATTER) : "")
                .reportCount(row.reportCount())
                .status(row.status())
                .statusLabel(getStatusLabel(row.status()))
                .isFlagged(isFlagged)
                .isRateLimited(isRateLimited)
                .flagReasons(flagReasons)
                .build();
    }

    private AdminAbuseFlagResponse mapToAbuseFlagResponse(AbuseFlag flag) {
        return AdminAbuseFlagResponse.builder()
                .id(flag.getId())
                .flagType(flag.getFlagType())
                .severity(flag.getSeverity())
                .status(flag.getStatus())
                .reason(flag.getReason())
                .evidence(flag.getEvidence())
                .createdAt(flag.getCreatedAt())
                .resolvedAt(flag.getResolvedAt())
                .build();
    }

    private String formatUserCode(Long id) {
        if (id == null) return "U-00000";
        return String.format("U-%05d", id);
    }

    private String getRoleLabel(String roleName) {
        if (roleName == null) return "Người dùng";
        return switch (roleName.toUpperCase(Locale.ROOT)) {
            case "ADMINISTRATOR" -> "Quản trị viên";
            case "MODERATOR" -> "Kiểm duyệt viên";
            case "BUSINESS_PARTNER" -> "Đối tác";
            case "GUEST" -> "Khách vãng lai";
            default -> "Người dùng";
        };
    }

    private String getStatusLabel(String status) {
        if (status == null) return "Bình thường";
        return switch (status.toUpperCase(Locale.ROOT)) {
            case "SUSPENDED" -> "Tạm khóa";
            case "BANNED" -> "Bị cấm";
            case "INACTIVE" -> "Chưa kích hoạt";
            default -> "Bình thường";
        };
    }

    private void validateStatus(String status) {
        if (!List.of("ACTIVE", "INACTIVE", "SUSPENDED", "BANNED").contains(status)) {
            throw new BadRequestException("Trạng thái không hợp lệ: " + status + ". Các trạng thái cho phép: ACTIVE, INACTIVE, SUSPENDED, BANNED");
        }
    }

    private boolean isCurrentAdmin(User user, String currentAdminUsername) {
        if (currentAdminUsername == null || currentAdminUsername.isBlank()) {
            return false;
        }
        return currentAdminUsername.equalsIgnoreCase(user.getEmail())
                || currentAdminUsername.equalsIgnoreCase(user.getPhoneNumber())
                || currentAdminUsername.equalsIgnoreCase(user.getUsername());
    }

    private void recordAuditLog(String actorUsername, String action, Long entityId, String previousValue, String newValue, String reason) {
        User actor = null;
        if (actorUsername != null && !actorUsername.isBlank()) {
            actor = userRepository.findByEmailOrPhoneNumber(actorUsername).orElse(null);
        }
        AuditLog auditLog = AuditLog.builder()
                .actorUser(actor)
                .action(action)
                .entityType("USER")
                .entityId(entityId)
                .previousValue(previousValue)
                .newValue(newValue)
                .reason(reason)
                .createdAt(LocalDateTime.now())
                .build();
        auditLogRepository.save(auditLog);
    }
}
