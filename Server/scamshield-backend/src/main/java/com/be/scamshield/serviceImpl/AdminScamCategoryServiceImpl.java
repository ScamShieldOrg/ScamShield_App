package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.admin.AdminScamCategoryResponse;
import com.be.scamshield.dto.request.CreateScamCategoryRequest;
import com.be.scamshield.dto.request.UpdateScamCategoryRequest;
import com.be.scamshield.entity.AuditLog;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.ScamCategoryConflictException;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ScamCategorieRepository;
import com.be.scamshield.repository.UserRepository;
import com.be.scamshield.service.IAdminScamCategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminScamCategoryServiceImpl implements IAdminScamCategoryService {
    private final ScamCategorieRepository categoryRepository;
    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AdminScamCategoryResponse> list() {
        return categoryRepository.findAllWithApprovedReportCounts().stream()
                .map(row -> AdminScamCategoryResponse.builder()
                        .id(row.getId()).code(row.getCode()).name(row.getName())
                        .description(row.getDescription()).isActive(row.getIsActive())
                        .version(row.getVersion()).approvedReportCount(row.getApprovedReportCount())
                        .build())
                .toList();
    }

    @Override
    @Transactional
    public AdminScamCategoryResponse create(CreateScamCategoryRequest request, Long actorId) {
        categoryRepository.lockCodeAllocation();
        LocalDateTime now = LocalDateTime.now();
        // The database requires code at insert time. Replace this transaction-local value
        // with the generated numeric ID before committing.
        ScamCategory category = ScamCategory.builder()
                .code("PENDING_" + UUID.randomUUID())
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .version(1).isActive(true).createdAt(now).updatedAt(now)
                .build();
        categoryRepository.saveAndFlush(category);
        category.setCode(category.getId().toString());
        categoryRepository.saveAndFlush(category);
        audit(actorId, "CREATE_SCAM_CATEGORY", category.getId(), null, category.getCode(),
                "Tạo phân loại lừa đảo: " + category.getName());
        return response(category);
    }

    @Override
    @Transactional
    public AdminScamCategoryResponse update(Long id, UpdateScamCategoryRequest request, Long actorId) {
        ScamCategory category = categoryRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phân loại lừa đảo"));
        if (!category.getVersion().equals(request.getVersion())) {
            throw new ScamCategoryConflictException("Phân loại đã được cập nhật; vui lòng tải lại trước khi lưu");
        }
        String oldName = category.getName();
        boolean oldActive = category.getIsActive();
        category.setName(request.getName().trim());
        category.setDescription(request.getDescription().trim());
        category.setIsActive(request.getIsActive());
        category.setVersion(category.getVersion() + 1);
        category.setUpdatedAt(LocalDateTime.now());
        categoryRepository.saveAndFlush(category);
        audit(actorId, "UPDATE_SCAM_CATEGORY", category.getId(), String.valueOf(oldActive),
                String.valueOf(category.getIsActive()),
                "Cập nhật phân loại " + category.getCode() + ": " + oldName + " → " + category.getName());
        return response(category);
    }

    private AdminScamCategoryResponse response(ScamCategory category) {
        long count = categoryRepository.countApprovedReports(category.getId());
        return AdminScamCategoryResponse.builder()
                .id(category.getId()).code(category.getCode()).name(category.getName())
                .description(category.getDescription()).isActive(category.getIsActive())
                .version(category.getVersion()).approvedReportCount(count).build();
    }

    private void audit(Long actorId, String action, Long categoryId, String previous, String current, String reason) {
        auditLogRepository.save(AuditLog.builder()
                .actorUser(userRepository.getReferenceById(actorId))
                .action(action).entityType("SCAM_CATEGORY").entityId(categoryId)
                .previousValue(previous).newValue(current).reason(reason)
                .createdAt(LocalDateTime.now()).build());
    }
}
