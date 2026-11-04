package com.be.scamshield.serviceImpl;

import com.be.scamshield.support.PostgresIntegrationTest;

import com.be.scamshield.constant.EducationContentType;
import com.be.scamshield.constant.EducationPublicationStatus;
import com.be.scamshield.dto.request.EducationContentFilterRequest;
import com.be.scamshield.dto.request.EducationHubFilterRequest;
import com.be.scamshield.dto.response.EducationContentResponse;
import com.be.scamshield.entity.EducationArticle;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.content.EducationStructuredContent;
import com.be.scamshield.entity.content.EducationStructuredContent.ChannelType;
import com.be.scamshield.entity.content.EducationStructuredContent.Example;
import com.be.scamshield.service.IEducationHubService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EducationHubPersistenceTest extends PostgresIntegrationTest {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.parse("2026-10-12T10:00:00");
    @Autowired private IEducationHubService service;
    @Autowired private EntityManager entityManager;
    @Autowired private MockMvc mvc;
    @MockitoBean private Clock clock;
    private User author;
    private ScamCategory bank;
    private ScamCategory otp;

    @BeforeEach
    void setUp() {
        when(clock.withZone(VIETNAM)).thenReturn(Clock.fixed(NOW.atZone(VIETNAM).toInstant(), VIETNAM));
        author = User.builder().fullName("Private author").phoneNumber("0900001234")
                .email("private-author@example.com").passwordHash("private-password-hash").status("ACTIVE")
                .createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(author);
        bank = category("GIA_DANH_NGAN_HANG", true);
        otp = category("DANH_CAP_OTP", true);
        var police = category("GIA_DANH_CQCN", true);
        var jobs = category("VIEC_LAM", true);
        var travel = category("VE_MAY_BAY_DU_LICH", true);
        var inactive = category("INACTIVE", false);
        content("sms-brandname", "SMS Brandname trạm phát BTS", EducationContentType.SCENARIO, bank, 1);
        content("video-zalo", "Video Zalo giả Cảnh sát", EducationContentType.SCENARIO, police, 2);
        content("ctv-online", "Tuyển CTV hoa hồng 10–20%", EducationContentType.SCENARIO, jobs, 3);
        content("hoan-ve", "Cuộc gọi hoàn vé", EducationContentType.SCENARIO, travel, 4);
        // Insert cards out of order to exercise their independent display order.
        content("otp-pin", "An toàn OTP & Mã PIN", EducationContentType.POCKET_CARD, otp, 3);
        content("ba-khong", "Quy tắc vàng 3 KHÔNG", EducationContentType.POCKET_CARD, null, 1);
        content("nguoi-cao-tuoi", "Bảo vệ người cao tuổi", EducationContentType.POCKET_CARD, police, 2);
        content("draft", "Bản nháp", EducationContentType.SCENARIO, bank, 5).setStatus(EducationPublicationStatus.DRAFT);
        content("archived", "Đã lưu trữ", EducationContentType.SCENARIO, bank, 6).setStatus(EducationPublicationStatus.ARCHIVED);
        content("future", "Hẹn xuất bản", EducationContentType.SCENARIO, bank, 7).setPublishedAt(NOW.plusSeconds(1));
        content("undated", "Chưa có ngày xuất bản", EducationContentType.SCENARIO, bank, 8).setPublishedAt(null);
        content("legacy", "Nội dung cũ", null, bank, 9);
        content("empty-json", "Chưa có nội dung", EducationContentType.SCENARIO, bank, 10).setStructuredContent(null);
        content("inactive", "Danh mục ngừng hoạt động", EducationContentType.SCENARIO, inactive, 11);
        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void hubReturnsFourScenariosAndThreeOrderedCardsWithVietnamTime() throws Exception {
        mvc.perform(get("/api/education-hub"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.timezone").value("Asia/Ho_Chi_Minh"))
                .andExpect(jsonPath("$.data.generatedAt").value("2026-10-12T10:00:00"))
                .andExpect(jsonPath("$.data.totalScenarios").value(4))
                .andExpect(jsonPath("$.data.scenarios.length()").value(4))
                .andExpect(jsonPath("$.data.scenarios[0].slug").value("sms-brandname"))
                .andExpect(jsonPath("$.data.totalPocketCards").value(3))
                .andExpect(jsonPath("$.data.pocketCards[0].slug").value("ba-khong"))
                .andExpect(jsonPath("$.data.pocketCards[2].slug").value("otp-pin"));
    }

    @Test
    void categoryFiltersScenariosWhileGeneralCardsRemainVisibleOnHub() {
        content("otp-scenario", "Đánh cắp OTP", EducationContentType.SCENARIO, otp, 5);
        EducationHubFilterRequest filter = new EducationHubFilterRequest();
        filter.setCategoryCode("GIA_DANH_NGAN_HANG");
        var hub = service.getHub(filter);
        assertThat(hub.totalScenarios()).isEqualTo(1);
        assertThat(hub.scenarios()).extracting(EducationContentResponse::slug).containsExactly("sms-brandname");
        assertThat(hub.pocketCards()).hasSize(3);
        filter.setCategoryCode("DANH_CAP_OTP");
        assertThat(service.getHub(filter).scenarios()).extracting(EducationContentResponse::slug).containsExactly("otp-scenario");
        EducationContentFilterRequest listFilter = new EducationContentFilterRequest();
        listFilter.setCategoryCode("DANH_CAP_OTP");
        assertThat(service.getContents(listFilter).getData()).extracting(EducationContentResponse::slug)
                .containsExactlyInAnyOrder("otp-scenario", "otp-pin");
        filter.setCategoryCode("UNKNOWN");
        assertThat(service.getHub(filter).scenarios()).isEmpty();
    }

    @Test
    void listingPaginatesPublishedContentAndIncludesUncategorizedCards() throws Exception {
        mvc.perform(get("/api/education-hub/contents").param("page", "1").param("size", "2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(7))
                .andExpect(jsonPath("$.data.totalPages").value(4))
                .andExpect(jsonPath("$.data.currentPage").value(1))
                .andExpect(jsonPath("$.data.pageSize").value(2))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.hasPrevious").value(true))
                .andExpect(jsonPath("$.data.data.length()").value(2));
        mvc.perform(get("/api/education-hub/contents").param("contentType", "POCKET_CARD"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(3))
                .andExpect(jsonPath("$.data.data[0].slug").value("ba-khong"));
    }

    @Test
    void hubLimitsCardsWithoutLosingTotalsAndLatestSortUsesPublicationTime() {
        content("newest", "Ca mới nhất", EducationContentType.SCENARIO, bank, 99).setPublishedAt(NOW);
        content("fourth-card", "Thẻ thứ tư", EducationContentType.POCKET_CARD, null, 4);
        var hub = service.getHub(new EducationHubFilterRequest());
        assertThat(hub.totalScenarios()).isEqualTo(5);
        assertThat(hub.scenarios()).hasSize(4).first().extracting(EducationContentResponse::slug).isEqualTo("newest");
        assertThat(hub.totalPocketCards()).isEqualTo(4);
        assertThat(hub.pocketCards()).hasSize(3);
    }

    @Test
    void jsonRoundTripsThroughDatabaseAndDetailDoesNotExposeAuthor() throws Exception {
        String response = mvc.perform(get("/api/education-hub/contents/sms-brandname"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.structuredContent.example.channelType").value("SMS"))
                .andExpect(jsonPath("$.data.structuredContent.example.highlightedText").value("portal-vcb-digibanks[.]vn"))
                .andExpect(jsonPath("$.data.structuredContent.recognitionSigns[0]").value("Tên miền giả."))
                .andExpect(jsonPath("$.data.structuredContent.recommendedActions[0]").value("Không bấm link."))
                .andExpect(jsonPath("$.data.structuredContent.tips").doesNotExist())
                .andExpect(jsonPath("$.data.content").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("private-author@example.com", "0900001234", "private-password-hash", "createdByUser");
        mvc.perform(get("/api/education-hub/contents/ba-khong"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.structuredContent.tips[0]").value("KHÔNG bấm link lạ"))
                .andExpect(jsonPath("$.data.structuredContent.example").doesNotExist());
    }

    @ParameterizedTest
    @CsvSource({"draft", "archived", "future", "undated", "legacy", "empty-json", "inactive", "not-found"})
    void detailHidesEveryNonPublicContent(String slug) throws Exception {
        mvc.perform(get("/api/education-hub/contents/{slug}", slug))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void filtersHaveTwoContentTypesAndOnlyActiveCategoriesWithoutTopics() throws Exception {
        mvc.perform(get("/api/education-hub/filters"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.contentTypes[0]").value("SCENARIO"))
                .andExpect(jsonPath("$.data.contentTypes[1]").value("POCKET_CARD"))
                .andExpect(jsonPath("$.data.topics").doesNotExist())
                .andExpect(jsonPath("$.data.categories.length()").value(5));
        assertThat(service.getFilters().categories()).extracting(EducationContentResponse.Category::code).doesNotContain("INACTIVE");
    }

    @Test
    void searchIgnoresCaseButEscapesWildcardCharactersAndCanMatchSummary() {
        EducationContentFilterRequest filter = new EducationContentFilterRequest();
        filter.setKeyword("  ctv  ");
        assertThat(service.getContents(filter).getData()).extracting(EducationContentResponse::slug).containsExactly("ctv-online");
        filter.setKeyword("%");
        assertThat(service.getContents(filter).getTotalItems()).isEqualTo(1);
        filter.setKeyword("_");
        assertThat(service.getContents(filter).getData()).isEmpty();
        filter.setKeyword("nHẬN dIỆn");
        assertThat(service.getContents(filter).getTotalItems()).isEqualTo(7);
    }

    @ParameterizedTest
    @CsvSource({"page,-1", "size,0", "size,51", "page,100001", "page,nope", "contentType,ARTICLE", "sort,INVALID", "categoryCode,invalid-code"})
    void invalidFiltersReturnJson400(String parameter, String value) throws Exception {
        mvc.perform(get("/api/education-hub/contents").param(parameter, value))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.isSuccess").value(false));
    }

    @Test
    void rejectsInvalidSlugAndOversizedSearch() throws Exception {
        mvc.perform(get("/api/education-hub/contents/INVALID_slug"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.slug").exists());
        mvc.perform(get("/api/education-hub/contents").param("keyword", "a".repeat(101)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.keyword").exists());
    }

    @Test
    void unknownCategoryAndPageBeyondEndHaveEmptyResults() throws Exception {
        mvc.perform(get("/api/education-hub/contents").param("categoryCode", "UNKNOWN"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(0));
        mvc.perform(get("/api/education-hub/contents").param("page", "20"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.totalItems").value(7))
                .andExpect(jsonPath("$.data.data").isEmpty());
    }

    @Test
    void publicSecurityIsLimitedToReadOperations() throws Exception {
        mvc.perform(post("/api/education-hub/contents"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void swaggerDocumentsPublicReadEndpointsAndTypedJsonWithoutArticleFields() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/education-hub'].get.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/education-hub/contents'].get.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/education-hub/contents/{slug}'].get.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/education-hub/filters'].get.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/education-hub'].get.parameters[?(@.name == 'categoryCode')]").isNotEmpty())
                .andExpect(jsonPath("$.paths['/api/education-hub'].get.parameters[?(@.name == 'topic')]").isEmpty())
                .andExpect(jsonPath("$.paths['/api/education-hub/contents'].get.parameters[?(@.name == 'topic')]").isEmpty())
                .andExpect(jsonPath("$.components.schemas.EducationFiltersResponse.properties.topics").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.EducationContentResponse.properties.content").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.EducationStructuredContent.properties.tips").exists())
                .andExpect(jsonPath("$.components.schemas.EducationContentResponse.properties.contentType.enum.length()").value(2));
    }

    private ScamCategory category(String code, boolean active) {
        var category = ScamCategory.builder().code(code).name(code).version(1).isActive(active)
                .createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(category);
        return category;
    }

    private EducationArticle content(String slug, String title, EducationContentType type, ScamCategory category, int order) {
        var json = type == EducationContentType.POCKET_CARD
                ? EducationStructuredContent.builder().tips(List.of("KHÔNG bấm link lạ")).build()
                : EducationStructuredContent.builder().example(Example.builder().channelType(ChannelType.SMS)
                        .senderName("VCB Digibank").displayTime("14:32").message("Xác minh tại portal-vcb-digibanks[.]vn")
                        .highlightedText("portal-vcb-digibanks[.]vn").build())
                        .recognitionSigns(List.of("Tên miền giả.")).scammerGoal("Chiếm đoạt OTP.")
                        .recommendedActions(List.of("Không bấm link.")).build();
        var content = EducationArticle.builder().title(title).slug(slug).contentType(type).category(category)
                .summary("Nhận diện lừa đảo").structuredContent(json).displayOrder(order)
                .status(EducationPublicationStatus.PUBLISHED).publishedAt(NOW.minusDays(1))
                .createdByUser(author).createdAt(NOW.minusDays(1)).updatedAt(NOW).build();
        entityManager.persist(content);
        return content;
    }
}
