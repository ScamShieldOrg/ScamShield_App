package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.dto.request.CreateScamCategoryRequest;
import com.be.scamshield.dto.request.UpdateScamCategoryRequest;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.Report;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.exception.ResourceNotFoundException;
import com.be.scamshield.exception.ScamCategoryConflictException;
import com.be.scamshield.repository.AuditLogRepository;
import com.be.scamshield.repository.ScamCategorieRepository;
import com.be.scamshield.service.IAdminScamCategoryService;
import com.be.scamshield.support.PostgresIntegrationTest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest(showSql = false, properties = "spring.test.database.replace=none")
@Import(AdminScamCategoryServiceImpl.class)
@ActiveProfiles("test")
class AdminScamCategoryPersistenceTest extends PostgresIntegrationTest {
    @Autowired private IAdminScamCategoryService service;
    @Autowired private ScamCategorieRepository categories;
    @Autowired private AuditLogRepository audits;
    @Autowired private EntityManager entityManager;
    private User admin;

    @BeforeEach
    void setUp() {
        admin = User.builder().fullName("Quản trị viên")
                .phoneNumber("09" + UUID.randomUUID().toString().replace("-", "").substring(0, 8))
                .email(UUID.randomUUID() + "@example.test").passwordHash("unused")
                .status("ACTIVE").reputationPoints(0).isPhoneVerified(true).build();
        entityManager.persist(admin);
        entityManager.flush();
    }

    @Test
    void listIncludesDisabledCategoriesAndCountsOnlyApprovedReports() {
        ScamCategory active = category("VIEC_LAM", true);
        ScamCategory disabled = category("OLD_CATEGORY", false);
        report(active, ReportStatus.APPROVED);
        report(active, ReportStatus.REJECTED);
        report(disabled, ReportStatus.APPROVED);
        entityManager.flush();

        var result = service.list();
        assertThat(result).extracting(item -> item.getCode()).containsExactly("OLD_CATEGORY", "VIEC_LAM");
        assertThat(result.get(0).getIsActive()).isFalse();
        assertThat(result.get(0).getApprovedReportCount()).isEqualTo(1);
        assertThat(result.get(1).getApprovedReportCount()).isEqualTo(1);
        assertThat(categories.findByIsActiveTrueOrderByNameAsc())
                .extracting(ScamCategory::getCode).containsExactly("VIEC_LAM");
    }

    @Test
    void createUsesDistinctIdsAsCodesAndEditPreservesCodeAndRejectsStaleVersion() {
        category("VIEC_LAM", true);
        var first = service.create(createRequest("Lừa đảo mới"), admin.getId());
        var second = service.create(createRequest("Lừa đảo khác"), admin.getId());
        assertThat(first.getCode()).isEqualTo(first.getId().toString());
        assertThat(second.getCode()).isEqualTo(second.getId().toString());
        assertThat(first.getCode()).isNotEqualTo(second.getCode());
        assertThat(first.getIsActive()).isTrue();
        assertThat(first.getVersion()).isEqualTo(1);

        var edited = service.update(first.getId(), updateRequest("Tên đã sửa", false, 1), admin.getId());
        assertThat(edited.getCode()).isEqualTo(first.getCode());
        assertThat(edited.getName()).isEqualTo("Tên đã sửa");
        assertThat(edited.getIsActive()).isFalse();
        assertThat(edited.getVersion()).isEqualTo(2);
        assertThat(categories.findByIsActiveTrueOrderByNameAsc())
                .extracting(ScamCategory::getCode).doesNotContain(first.getCode());
        assertThatThrownBy(() -> service.update(first.getId(), updateRequest("Ghi đè", true, 1), admin.getId()))
                .isInstanceOf(ScamCategoryConflictException.class);
        assertThatThrownBy(() -> service.update(999999L, updateRequest("Không có", true, 1), admin.getId()))
                .isInstanceOf(ResourceNotFoundException.class);
        assertThat(audits.findByEntityTypeAndEntityIdOrderByCreatedAtDesc("SCAM_CATEGORY", first.getId()))
                .hasSize(2);
    }

    private ScamCategory category(String code, boolean active) {
        LocalDateTime now = LocalDateTime.now();
        ScamCategory category = ScamCategory.builder().code(code).name(code)
                .description("Mô tả " + code).version(1).isActive(active)
                .createdAt(now).updatedAt(now).build();
        entityManager.persist(category);
        return category;
    }

    private void report(ScamCategory category, ReportStatus status) {
        LocalDateTime now = LocalDateTime.now();
        Indicator indicator = Indicator.builder().type(IndicatorType.URL)
                .normalizedValue(UUID.randomUUID() + ".example")
                .createdAt(now).updatedAt(now).build();
        entityManager.persist(indicator);
        entityManager.persist(Report.builder().reporterUser(admin).indicator(indicator)
                .category(category).status(status).createdAt(now).updatedAt(now).build());
    }

    private CreateScamCategoryRequest createRequest(String name) {
        var request = new CreateScamCategoryRequest();
        request.setName(name);
        request.setDescription("Mô tả phân loại hợp lệ");
        return request;
    }

    private UpdateScamCategoryRequest updateRequest(String name, boolean active, int version) {
        var request = new UpdateScamCategoryRequest();
        request.setName(name);
        request.setDescription("Mô tả đã cập nhật");
        request.setIsActive(active);
        request.setVersion(version);
        return request;
    }
}
