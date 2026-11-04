package com.be.scamshield.serviceImpl;

import com.be.scamshield.constant.VietnamProvince;
import com.be.scamshield.external.ScamCheckAiClient;

import com.be.scamshield.constant.ReportStatus;
import com.be.scamshield.support.PostgresIntegrationTest;

import com.be.scamshield.constant.ScamDashboardPeriod;
import com.be.scamshield.dto.request.ScamDashboardFilterRequest;
import com.be.scamshield.dto.response.ScamDashboardSummaryResponse.ConfirmedCategory;
import com.be.scamshield.dto.response.ScamDashboardSummaryResponse.Hotspot;
import com.be.scamshield.entity.*;
import com.be.scamshield.entity.ScamCategory;
import com.be.scamshield.service.IScamDashboardService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ScamDashboardPersistenceTest extends PostgresIntegrationTest {
    private static final ZoneId VIETNAM = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final LocalDateTime NOW = LocalDateTime.parse("2026-10-09T01:00:00");
    @Autowired
    private IScamDashboardService service;
    @Autowired
    private EntityManager entityManager;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private MockMvc mvc;
    @MockitoBean
    private Clock clock;
    @MockitoBean
    private ScamCheckAiClient scamCheckAiClient;
    private User reporter;
    private ScamCategory jobs;
    private ScamCategory prize;
    private Indicator activeUrl;

    @BeforeEach
    void setUp() {
        when(clock.withZone(VIETNAM)).thenReturn(Clock.fixed(Instant.parse("2026-10-08T18:00:00Z"), VIETNAM));
        reporter = User.builder().fullName("ScamDashboard reporter").phoneNumber("0900000123")
                .email("dashboard-fixture@example.com").passwordHash("private-password-hash").status("ACTIVE")
                .createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(reporter);
        jobs = category("VIEC_LAM", "Lừa đảo việc làm", true);
        prize = category("TRUNG_THUONG", "Lừa đảo trúng thưởng", true);
        category("LEGACY", "Danh mục cũ", false);
        activeUrl = indicator("URL", "private-scam.example");
        confirm(activeUrl, jobs, "ACTIVE", NOW.minusHours(1), null);
        report(activeUrl, prize, "01", "2026-09-10T00:00:00");
        report(activeUrl, jobs, "79", "2026-10-08T12:00:00");
        report(activeUrl, jobs, null, "2026-10-09T00:00:00");
        Indicator oldBank = indicator("BANK_ACCOUNT", "private-old-account");
        confirm(oldBank, jobs, "ACTIVE", LocalDateTime.parse("2026-09-09T23:59:59"), null);
        report(oldBank, jobs, "48", "2026-10-09T00:00:00");
        report(indicator("PHONE", "private-phone"), prize, "01", "2026-10-09T00:00:00");
        Indicator retracted = indicator("URL", "private-retracted-url");
        confirm(retracted, prize, "ACTIVE", NOW.minusHours(1), NOW.minusMinutes(30));
        report(retracted, prize, "04", "2026-10-09T00:00:00");
        Indicator inactive = indicator("URL", "private-inactive-url");
        confirm(inactive, jobs, "RETRACTED", NOW.minusHours(1), null);
        report(inactive, jobs, "04", "2026-10-09T00:00:00");
        Indicator future = indicator("URL", "private-future-url");
        confirm(future, jobs, "ACTIVE", NOW.plusHours(1), null);
        report(future, jobs, "01", "2026-10-09T00:00:00");
        confirm(indicator("BANK_ACCOUNT", "private-new-account"), prize, "ACTIVE", NOW.minusHours(1), null);
        confirm(indicator("URL", "private-orphan-url"), prize, "ACTIVE", NOW.minusHours(1), null);
        report(activeUrl, jobs, "01", "2026-09-09T23:59:59");
        report(activeUrl, jobs, "79", "2026-08-11T00:00:00");
        report(activeUrl, jobs, "01", "2026-08-10T23:59:59");
        report(activeUrl, jobs, "01", "2026-10-09T02:00:00");
        report(activeUrl, jobs, "01", "2026-10-10T00:00:00");
        entityManager.flush();
    }

    @Test
    void computesAllCardsWithoutDoubleCountingSharedIndicatorsAndExcludesFutureOrRetractedConfirmations() {
        var summary = service.getSummary(new ScamDashboardFilterRequest());
        assertThat(summary.reports().total()).isEqualTo(8);
        assertThat(summary.reports().previousTotal()).isEqualTo(2);
        assertThat(summary.reports().changePercent()).isEqualByComparingTo("300.0");
        assertThat(summary.verifiedHighRisk().total()).isEqualTo(4);
        assertThat(summary.verifiedHighRisk().percentOfReports()).isEqualByComparingTo("50.0");
        var blacklist = summary.verifiedHighRisk().blacklistAdditions();
        assertThat(blacklist.total()).isEqualTo(3);
        assertThat(blacklist.bankAccounts()).isEqualTo(1);
        assertThat(blacklist.urls()).isEqualTo(2);
        assertThat(summary.coverage().reportedProvinces()).isEqualTo(4);
        assertThat(summary.coverage().totalProvinces()).isEqualTo(34);
        assertThat(summary.coverage().percent()).isEqualByComparingTo("11.8");
        assertThat(summary.coverage().unlocatedReports()).isEqualTo(1);
        assertThat(summary.coverage().hotspots()).extracting(Hotspot::regionCode).containsExactly("01", "04");
        assertThat(summary.coverage().hotspotsPercent()).isEqualByComparingTo("62.5");
        assertThat(summary.scamTypes().total()).isEqualTo(2);
        assertThat(summary.scamTypes().categories()).extracting(ConfirmedCategory::code).containsExactly("TRUNG_THUONG", "VIEC_LAM");
        assertThat(summary.scamTypes().categories()).extracting(ConfirmedCategory::confirmedIndicators).containsExactly(2L, 1L);
    }

    @Test
    void combinesAllAdvancedFiltersAndUsesOneProvinceAsCoverageDenominator() {
        ScamDashboardFilterRequest filter = new ScamDashboardFilterRequest();
        filter.setRegionCode("79");
        filter.setCategoryCode("VIEC_LAM");
        filter.setIndicatorType("URL");
        var summary = service.getSummary(filter);
        assertThat(summary.reports().total()).isEqualTo(1);
        assertThat(summary.reports().previousTotal()).isEqualTo(1);
        assertThat(summary.reports().changePercent()).isEqualByComparingTo("0.0");
        assertThat(summary.verifiedHighRisk().total()).isEqualTo(1);
        assertThat(summary.verifiedHighRisk().percentOfReports()).isEqualByComparingTo("100.0");
        assertThat(summary.verifiedHighRisk().blacklistAdditions().total()).isEqualTo(1);
        assertThat(summary.coverage().reportedProvinces()).isEqualTo(1);
        assertThat(summary.coverage().totalProvinces()).isEqualTo(1);
        assertThat(summary.coverage().percent()).isEqualByComparingTo("100.0");
        assertThat(summary.coverage().hotspots()).extracting(Hotspot::regionName).containsExactly("TP. Hồ Chí Minh");
        assertThat(summary.scamTypes().total()).isEqualTo(1);
    }

    @Test
    void provinceFilterDoesNotDuplicateBlacklistAndCategoryFilterUsesVerifiedClassification() {
        ScamDashboardFilterRequest filter = new ScamDashboardFilterRequest();
        filter.setRegionCode("01");
        var summary = service.getSummary(filter);
        assertThat(summary.reports().total()).isEqualTo(3);
        assertThat(summary.verifiedHighRisk().total()).isEqualTo(1);
        assertThat(summary.verifiedHighRisk().blacklistAdditions().total()).isEqualTo(1);
        filter.setRegionCode(null);
        filter.setCategoryCode("VIEC_LAM");
        summary = service.getSummary(filter);
        assertThat(summary.reports().total()).isEqualTo(6);
        assertThat(summary.verifiedHighRisk().total()).isEqualTo(4);
        assertThat(summary.verifiedHighRisk().blacklistAdditions().total()).isEqualTo(1);
        assertThat(summary.scamTypes().total()).isEqualTo(1);
    }

    @Test
    void countsConfirmedIndicatorsWithoutSourceReportAndAppliesEveryAdvancedFilterToThem() {
        ScamDashboardFilterRequest filter = new ScamDashboardFilterRequest();
        filter.setCategoryCode("TRUNG_THUONG");
        filter.setIndicatorType("URL");
        var summary = service.getSummary(filter);
        assertThat(summary.reports().total()).isEqualTo(1);
        assertThat(summary.verifiedHighRisk().total()).isZero();
        assertThat(summary.verifiedHighRisk().blacklistAdditions().total()).isEqualTo(1);
        assertThat(summary.scamTypes().categories()).containsExactly(new ConfirmedCategory("TRUNG_THUONG", "Lừa đảo trúng thưởng", 1));
    }

    @Test
    void returnsZeroCountsAndEmptyListsWhenSelectedPeriodHasNoData() {
        ScamDashboardFilterRequest filter = new ScamDashboardFilterRequest();
        filter.setPeriod(ScamDashboardPeriod.YEAR);
        filter.setYear(2025);
        var summary = service.getSummary(filter);
        assertThat(summary.reports().total()).isZero();
        assertThat(summary.reports().previousTotal()).isZero();
        assertThat(summary.reports().changePercent()).isEqualByComparingTo("0.0");
        assertThat(summary.verifiedHighRisk().percentOfReports()).isEqualByComparingTo("0.0");
        assertThat(summary.verifiedHighRisk().blacklistAdditions().total()).isZero();
        assertThat(summary.coverage().reportedProvinces()).isZero();
        assertThat(summary.coverage().hotspots()).isEmpty();
        assertThat(summary.scamTypes().categories()).isEmpty();
    }

    @Test
    void includesBothEndsOfCustomDateRangeButNotTheFollowingDay() {
        ScamDashboardFilterRequest filter = new ScamDashboardFilterRequest();
        filter.setPeriod(ScamDashboardPeriod.CUSTOM);
        filter.setFromDate(LocalDate.parse("2026-09-09"));
        filter.setToDate(LocalDate.parse("2026-09-10"));
        var summary = service.getSummary(filter);
        assertThat(summary.reports().total()).isEqualTo(2);
        assertThat(summary.verifiedHighRisk().blacklistAdditions().bankAccounts()).isEqualTo(1);
    }

    @Test
    void flagsMissingRegionCodesWithoutClaimingProvinceCoverage() {
        jdbc.update("UPDATE reports SET region_code = NULL");
        var summary = service.getSummary(new ScamDashboardFilterRequest());
        assertThat(summary.reports().total()).isEqualTo(8);
        assertThat(summary.coverage().reportedProvinces()).isZero();
        assertThat(summary.coverage().percent()).isEqualByComparingTo("0.0");
        assertThat(summary.coverage().unlocatedReports()).isEqualTo(8);
        assertThat(summary.coverage().hotspots()).isEmpty();
    }

    @Test
    void exposesActualFilterOptionsAndPublicApiReturnsOnlyAggregates() throws Exception {
        var options = service.getFilters();
        assertThat(options.regions()).hasSize(34);
        assertThat(options.categories()).hasSize(3);
        assertThat(options.indicatorTypes()).containsExactly("BANK_ACCOUNT", "PHONE", "URL");
        mvc.perform(get("/api/dashboard/filters"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.defaultPeriod").value("LAST_30_DAYS"))
                .andExpect(jsonPath("$.data.regions.length()").value(34));
        String response = mvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.reports.total").value(8))
                .andExpect(jsonPath("$.data.scamTypes.total").value(2))
                .andExpect(jsonPath("$.data.scamTypes.calculationBasis").doesNotExist())
                .andExpect(jsonPath("$.data.scamTypes.preventionEventsMeasured").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain("dashboard-fixture@example.com", "0900000123", "private-password-hash", "private-scam.example");
    }

    @Test
    void swaggerDocumentsThePublicEndpointsAndTimeFilterEnum() throws Exception {
        mvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paths['/api/dashboard/summary'].get").exists())
                .andExpect(jsonPath("$.paths['/api/dashboard/filters'].get").exists())
                .andExpect(jsonPath("$.components.schemas.ScamTypeSummary.title").value("Số danh mục lừa đảo đã xác thực"))
                .andExpect(jsonPath("$.components.schemas.ScamTypeSummary.properties.calculationBasis").doesNotExist())
                .andExpect(jsonPath("$.components.schemas.ScamTypeSummary.properties.preventionEventsMeasured").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/dashboard/summary'].get.security").isEmpty())
                .andExpect(jsonPath("$.paths['/api/dashboard/summary'].get.parameters[?(@.name == 'period')].schema.enum[0]").value("TODAY"));
    }

    private ScamCategory category(String code, String name, boolean active) {
        ScamCategory category = ScamCategory.builder().code(code).name(name).version(1).isActive(active)
                .createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(category);
        return category;
    }

    private Indicator indicator(String type, String value) {
        Indicator indicator = Indicator.builder().type(type).normalizedValue(value).createdAt(NOW).updatedAt(NOW).build();
        entityManager.persist(indicator);
        return indicator;
    }

    private void confirm(Indicator indicator, ScamCategory category, String status, LocalDateTime confirmedAt, LocalDateTime retractedAt) {
        entityManager.persist(ConfirmedIndicator.builder().indicator(indicator).category(category).status(status)
                .confirmedByUser(reporter).confirmedAt(confirmedAt).retractedAt(retractedAt).build());
    }

    private void report(Indicator indicator, ScamCategory category, String regionCode, String createdAt) {
        entityManager.persist(Report.builder().reporterUser(reporter).indicator(indicator).status(ReportStatus.PENDING)
                .category(category).regionCode(regionCode == null ? null : VietnamProvince.fromCode(regionCode).orElseThrow())
                .createdAt(LocalDateTime.parse(createdAt)).updatedAt(NOW).build());
    }
}
