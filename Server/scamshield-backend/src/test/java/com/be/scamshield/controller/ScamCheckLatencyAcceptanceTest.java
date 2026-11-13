package com.be.scamshield.controller;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/** Live API acceptance test: requires a running Core + AI and an account with 100 checks available. */
@EnabledIfEnvironmentVariable(named = "SCAM_CHECK_ACCEPTANCE_URL", matches = "https?://.+")
class ScamCheckLatencyAcceptanceTest {
    @Test
    void atLeast95PercentOf100ValidVietnameseChecksCompleteWithinThreeSeconds() throws Exception {
        String token = System.getenv("SCAM_CHECK_ACCEPTANCE_TOKEN");
        assertThat(token).as("Set SCAM_CHECK_ACCEPTANCE_TOKEN to a valid user JWT with quota >= 100").isNotBlank();
        var client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
        var json = new ObjectMapper();
        String endpoint = System.getenv("SCAM_CHECK_ACCEPTANCE_URL").replaceAll("/+$", "") + "/api/scam-checks";
        String[] messages = {
                "Tài khoản bị khóa hãy gửi mã OTP ngay",
                "Chiều nay mình gặp nhau ở thư viện nhé",
                "Bạn kiểm tra giúp mình thông báo này nhé",
                "Bạn đã trúng thưởng hãy chuyển tiền phí nhận quà",
                "Tôi đã nhận được tài liệu cảm ơn bạn"
        };
        int fast = 0;
        for (int i = 0; i < 100; i++) {
            var request = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(65))
                    .header("Authorization", "Bearer " + token).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(
                            Map.of("inputType", "MESSAGE", "content", messages[i % messages.length])))).build();
            long started = System.nanoTime();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            long elapsed = System.nanoTime() - started;
            assertThat(response.statusCode()).as("Sample %s must be a successful valid check", i + 1).isEqualTo(200);
            var data = json.readTree(response.body()).path("data");
            assertThat(data.path("status").asText()).isEqualTo("COMPLETED");
            assertThat(data.path("verdict").asText()).isIn(Set.of("SCAM_RISK", "LOW_RISK", "UNKNOWN"));
            assertThat(data.path("explanation").asText()).isNotBlank();
            if (elapsed <= Duration.ofSeconds(3).toNanos()) fast++;
        }
        assertThat(fast).as("At least 95 of 100 valid checks must complete within 3 seconds").isGreaterThanOrEqualTo(95);
    }
}
