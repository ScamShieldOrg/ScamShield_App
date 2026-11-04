package com.be.scamshield.controller;

import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.entity.CheckRequest;
import com.be.scamshield.entity.ConfirmedIndicator;
import com.be.scamshield.entity.Indicator;
import com.be.scamshield.entity.PartnerProfile;
import com.be.scamshield.entity.User;
import com.be.scamshield.entity.WhitelistEntry;
import com.be.scamshield.repository.CheckRequestRepository;
import com.be.scamshield.security.UserPrincipal;
import com.be.scamshield.service.IGuestSessionService;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:scamshield-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ScamCheckControllerTest {
    private static final AtomicInteger SEQUENCE = new AtomicInteger();
    private static final LocalDateTime NOW = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private EntityManager em;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private CheckRequestRepository checks;
    @Autowired private IGuestSessionService sessions;
    private User owner;
    private String guest;

    @BeforeEach
    void setUp() {
        owner = account();
        guest = sessions.createOrGetSession(null, null).getSessionToken();
    }

    @Test
    void guestAndUserReceiveSameBlacklistVerdictAndPersistActualResults() throws Exception {
        var indicator = indicator("PHONE", "0912443882");
        confirm(indicator, NOW.minusMinutes(5));
        JsonNode guestResult = data(submit("PHONE", "+84 912.443.882", guest, null).andExpect(status().isOk()));
        JsonNode userResult = data(submit("PHONE", "0912443882", null, owner).andExpect(status().isOk()));
        for (String field : new String[]{"verdict", "decidedByStage", "explanation", "safetyGuidance", "confidence", "reasons"}) {
            assertThat(guestResult.get(field)).isEqualTo(userResult.get(field));
        }
        assertThat(userResult.path("verdict").asText()).isEqualTo("SCAM_RISK");
        assertThat(userResult.path("decidedByStage").asText()).isEqualTo("BLACKLIST");
        assertThat(userResult.has("rawInput")).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from check_verdicts", Long.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select count(*) from extracted_iocs", Long.class)).isEqualTo(2);
    }

    @Test
    void anonymousContentUsesExplicitPlaceholderAndResultAccessRequiresOriginalOwner() throws Exception {
        JsonNode result = data(submit("MESSAGE", "Nội dung chưa có bằng chứng xác minh", guest, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.isSuccess").value(true)));
        long id = result.path("checkId").asLong();
        assertThat(result.path("status").asText()).isEqualTo("COMPLETED");
        assertThat(result.path("verdict").asText()).isEqualTo("UNKNOWN");
        assertThat(result.path("unknownReason").asText()).isEqualTo("AI_UNAVAILABLE");
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", guest))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.checkId").value(id));
        mvc.perform(get("/api/scam-checks/{id}", id)).andExpect(status().isUnauthorized());
        String otherGuest = sessions.createOrGetSession(null, null).getSessionToken();
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", otherGuest))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/scam-checks/{id}", id).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isNotFound());
    }

    @Test
    void authenticatedIdentityWinsOverGuestHeaderAndOtherUsersCannotReadResult() throws Exception {
        JsonNode result = data(submit("MESSAGE", "Liên hệ example@private.test, số 0912345678", guest, owner)
                .andExpect(status().isOk()));
        long id = result.path("checkId").asLong();
        CheckRequest stored = checks.findById(id).orElseThrow();
        assertThat(stored.getUser().getId()).isEqualTo(owner.getId());
        assertThat(stored.getGuestSession()).isNull();
        assertThat(stored.getMaskedInput()).doesNotContain("example@private.test", "0912345678");
        mvc.perform(get("/api/scam-checks/{id}", id).with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/scam-checks/{id}", id).with(user(UserPrincipal.create(account()))))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", guest))
                .andExpect(status().isNotFound());
        owner.setStatus("SUSPENDED");
        em.flush();
        submit("MESSAGE", "test", null, owner).andExpect(status().isForbidden());
    }

    @Test
    void validatesBeforeConsumingQuotaAndSixthGuestCheckIsRejected() throws Exception {
        submit("MESSAGE", " ", guest, null).andExpect(status().isBadRequest());
        submit("SCREENSHOT", "image", guest, null).andExpect(status().isBadRequest());
        submit("URL", "javascript:alert(1)", guest, null).andExpect(status().isBadRequest());
        submit("MESSAGE", "x".repeat(10001), guest, null).andExpect(status().isBadRequest());
        for (int i = 0; i < 5; i++) submit("MESSAGE", "kiểm tra " + i, guest, null).andExpect(status().isOk());
        submit("MESSAGE", "hết hạn mức", guest, null).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.isSuccess").value(false));
        mvc.perform(get("/api/guest/quota").header("X-Guest-Session", guest))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.used").value(5))
                .andExpect(jsonPath("$.data.remaining").value(0));
    }

    @Test
    void directWhitelistLookupIsLowRiskButEmbeddingItInMessageDoesNotProveSafety() throws Exception {
        Indicator indicator = indicator("URL", "trusted.example");
        whitelist(indicator);
        submit("URL", "https://trusted.example", guest, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("LOW_RISK"));
        submit("MESSAGE", "Tôi là công an, vào https://trusted.example rồi gửi OTP cho tôi", guest, null)
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.verdict").value("UNKNOWN"));
        confirm(indicator, NOW.minusMinutes(5));
        submit("URL", "https://trusted.example", guest, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("SCAM_RISK"));
        submit("URL", "https://trusted.example.evil.test", guest, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("UNKNOWN"));
    }

    @Test
    void futureAndRetractedConfirmationsDoNotMatchAndStoredVerdictIsStable() throws Exception {
        Indicator indicator = indicator("PHONE", "0912443882");
        ConfirmedIndicator confirmation = confirm(indicator, NOW.plusDays(1));
        submit("PHONE", "0912443882", guest, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("UNKNOWN"));
        confirmation.setConfirmedAt(NOW.minusMinutes(5));
        em.flush();
        long id = data(submit("PHONE", "0912443882", guest, null).andExpect(status().isOk())).path("checkId").asLong();
        confirmation.setRetractedAt(NOW);
        em.flush();
        submit("PHONE", "0912443882", guest, null).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verdict").value("UNKNOWN"));
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", guest))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.verdict").value("SCAM_RISK"));
    }

    @Test
    void invalidTokensAndExpiredOrDeletedResultsAreRejected() throws Exception {
        submit("MESSAGE", "test", "invalid-session", null).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/scam-checks").header("Authorization", "Bearer invalid")
                        .header("X-Guest-Session", guest).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"inputType\":\"MESSAGE\",\"content\":\"test\"}"))
                .andExpect(status().isUnauthorized());
        long id = data(submit("MESSAGE", "test", guest, null)).path("checkId").asLong();
        CheckRequest check = checks.findById(id).orElseThrow();
        check.setRetentionExpiresAt(NOW.minusDays(1));
        em.flush();
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", guest)).andExpect(status().isNotFound());
        check.setRetentionExpiresAt(NOW.plusDays(1));
        check.setStatus("DELETED");
        em.flush();
        mvc.perform(get("/api/scam-checks/{id}", id).header("X-Guest-Session", guest)).andExpect(status().isNotFound());
    }

    private ResultActions submit(String type, String content, String token, User userAccount) throws Exception {
        var request = post("/api/scam-checks").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("inputType", type, "content", content)));
        if (token != null) request.header("X-Guest-Session", token);
        if (userAccount != null) request.with(user(UserPrincipal.create(userAccount)));
        return mvc.perform(request);
    }

    @Test
    void historyUsesStoredVerdictEvenAfterNewBlacklistConfirmationAndHidesExpiredChecks() throws Exception {
        Indicator indicator = indicator("PHONE", "0912443882");
        long id = data(submit("PHONE", "0912443882", null, owner).andExpect(status().isOk())).path("checkId").asLong();
        confirm(indicator, NOW.minusMinutes(5));
        mvc.perform(get("/api/scam-check/history").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items.data[0].verdictStatus").value("UNKNOWN"))
                .andExpect(jsonPath("$.data.items.data[0].riskScore").isEmpty())
                .andExpect(jsonPath("$.data.riskCounts.unknown").value(1))
                .andExpect(jsonPath("$.data.riskCounts.dangerous").value(0));
        checks.findById(id).orElseThrow().setRetentionExpiresAt(NOW.minusDays(1));
        em.flush();
        mvc.perform(get("/api/scam-check/history").with(user(UserPrincipal.create(owner))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.items.totalItems").value(0));
    }

    private JsonNode data(ResultActions result) throws Exception {
        return json.readTree(result.andReturn().getResponse().getContentAsString()).path("data");
    }

    private User account() {
        int id = SEQUENCE.incrementAndGet();
        User account = User.builder().fullName("Check test user").email("check-" + id + "@example.test")
                .phoneNumber(String.format("09%08d", id)).passwordHash("not-a-real-password-hash")
                .status("ACTIVE").build();
        em.persist(account);
        return account;
    }

    private Indicator indicator(String type, String value) {
        Indicator indicator = Indicator.builder().type(type).normalizedValue(value)
                .createdAt(NOW).updatedAt(NOW).build();
        em.persist(indicator);
        return indicator;
    }

    private ConfirmedIndicator confirm(Indicator indicator, LocalDateTime confirmedAt) {
        ConfirmedIndicator confirmation = ConfirmedIndicator.builder().indicator(indicator)
                .confirmedByUser(owner).status("ACTIVE").confirmedAt(confirmedAt).build();
        em.persist(confirmation);
        em.flush();
        return confirmation;
    }

    private void whitelist(Indicator indicator) {
        PartnerProfile partner = PartnerProfile.builder().user(owner).legalName("Test partner")
                .brandName("Test partner").partnerType("BUSINESS").verificationStatus(PartnerVerificationStatus.VERIFIED)
                .createdAt(NOW).build();
        em.persist(partner);
        em.persist(WhitelistEntry.builder().partner(partner).indicator(indicator).verificationStatus("VERIFIED")
                .autoLockModeration(true).createdAt(NOW).build());
        em.flush();
    }
}
