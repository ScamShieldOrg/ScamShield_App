package com.be.scamshield.controller;

import com.be.scamshield.dto.request.CreateGuestSessionRequest;
import com.be.scamshield.entity.GuestSession;
import com.be.scamshield.entity.QuotaPolicy;
import com.be.scamshield.repository.GuestSessionRepository;
import com.be.scamshield.repository.QuotaPolicyRepository;
import com.be.scamshield.service.IQuotaCounterService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class GuestQuotaControllerTest {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private GuestSessionRepository guestSessionRepository;

    @Autowired
    private QuotaPolicyRepository quotaPolicyRepository;

    @Autowired
    private IQuotaCounterService quotaCounterService;

    @BeforeEach
    void setUp() {
        quotaPolicyRepository.findByName("GUEST").ifPresentOrElse(
                p -> {
                    p.setMaxChecksPerDay(5);
                    quotaPolicyRepository.save(p);
                },
                () -> quotaPolicyRepository.save(QuotaPolicy.builder()
                        .name("GUEST")
                        .maxChecksPerDay(5)
                        .maxReportsPerDay(0)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build())
        );
    }

    @Test
    void createSession_generatesNewTokenAndSavesHash() throws Exception {
        CreateGuestSessionRequest request = CreateGuestSessionRequest.builder()
                .deviceFingerprint("device_fp_test_123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/guest/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("Khởi tạo phiên khách vãng lai thành công"))
                .andExpect(jsonPath("$.data.sessionToken").isString())
                .andReturn();

        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        String token = root.path("data").path("sessionToken").asText();
        assertThat(token).startsWith("gs_");

        // Verify token itself is NOT stored raw, but stored as SHA-256 hash
        boolean foundRaw = guestSessionRepository.findAll().stream()
                .anyMatch(s -> token.equals(s.getSessionTokenHash()));
        assertThat(foundRaw).isFalse();
    }

    @Test
    void createSession_reusesExistingValidToken() throws Exception {
        CreateGuestSessionRequest createReq = CreateGuestSessionRequest.builder()
                .deviceFingerprint("device_fp_reuse_456")
                .build();

        MvcResult initialResult = mockMvc.perform(post("/api/guest/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isOk())
                .andReturn();

        String token = objectMapper.readTree(initialResult.getResponse().getContentAsString())
                .path("data").path("sessionToken").asText();

        // Call again with same token -> should return same token
        CreateGuestSessionRequest reuseReq = CreateGuestSessionRequest.builder()
                .deviceFingerprint("device_fp_reuse_456")
                .sessionToken(token)
                .build();

        mockMvc.perform(post("/api/guest/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(reuseReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.sessionToken").value(token));
    }

    @Test
    void getGuestQuota_withoutToken_returnsDefaultLimitAndZeroUsed() throws Exception {
        mockMvc.perform(get("/api/guest/quota")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.message").value("Lấy thông tin hạn mức kiểm tra AI thành công"))
                .andExpect(jsonPath("$.data.limit").value(5))
                .andExpect(jsonPath("$.data.used").value(0))
                .andExpect(jsonPath("$.data.remaining").value(5))
                .andExpect(jsonPath("$.data.resetsAt").isNotEmpty());
    }

    @Test
    void getGuestQuota_withHeaderToken_returnsQuota() throws Exception {
        String rawToken = "gs_test_header_token_12345";
        String tokenHash = hashSha256(rawToken);

        GuestSession session = guestSessionRepository.save(GuestSession.builder()
                .sessionTokenHash(tokenHash)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build());

        mockMvc.perform(get("/api/guest/quota")
                        .header("X-Guest-Session", rawToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.limit").value(5))
                .andExpect(jsonPath("$.data.used").value(0))
                .andExpect(jsonPath("$.data.remaining").value(5));
    }

    @Test
    void getGuestQuota_withQueryParam_returnsQuota() throws Exception {
        mockMvc.perform(get("/api/guest/quota")
                        .param("sessionToken", "gs_arbitrary_query_param")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.limit").value(5))
                .andExpect(jsonPath("$.data.used").value(0))
                .andExpect(jsonPath("$.data.remaining").value(5));
    }

    @Test
    void getGuestQuota_withExistingUsage_calculatesRemainingCorrectly() throws Exception {
        String rawToken = "gs_used_token_999";
        String tokenHash = hashSha256(rawToken);

        GuestSession session = guestSessionRepository.save(GuestSession.builder()
                .sessionTokenHash(tokenHash)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build());

        String todayStr = LocalDate.now(VIETNAM_ZONE).format(DATE_FORMATTER);
        String quotaKey = "quota:guest:" + session.getId() + ":" + todayStr;

        // Simulate 2 checks already used
        quotaCounterService.set(quotaKey, 2, Duration.ofHours(12));

        mockMvc.perform(get("/api/guest/quota")
                        .header("X-Guest-Session", rawToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.limit").value(5))
                .andExpect(jsonPath("$.data.used").value(2))
                .andExpect(jsonPath("$.data.remaining").value(3));
    }

    @Test
    void getGuestQuota_whenUsageExceedsLimit_remainingIsZero() throws Exception {
        String rawToken = "gs_exceeded_token_888";
        String tokenHash = hashSha256(rawToken);

        GuestSession session = guestSessionRepository.save(GuestSession.builder()
                .sessionTokenHash(tokenHash)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusDays(30))
                .build());

        String todayStr = LocalDate.now(VIETNAM_ZONE).format(DATE_FORMATTER);
        String quotaKey = "quota:guest:" + session.getId() + ":" + todayStr;

        // Simulate 7 checks used (limit is 5)
        quotaCounterService.set(quotaKey, 7, Duration.ofHours(12));

        mockMvc.perform(get("/api/guest/quota")
                        .header("X-Guest-Session", rawToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.limit").value(5))
                .andExpect(jsonPath("$.data.used").value(7))
                .andExpect(jsonPath("$.data.remaining").value(0));
    }

    private String hashSha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] encodedhash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(encodedhash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
