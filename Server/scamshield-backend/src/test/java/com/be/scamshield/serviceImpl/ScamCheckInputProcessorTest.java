package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScamCheckInputProcessorTest {
    private final ScamCheckInputProcessor processor = new ScamCheckInputProcessor();

    @Test
    void normalizesVietnamPhoneAndRetainsInternationalLookupAliases() {
        var input = processor.prepare(request("PHONE", "+84 912.443.882"));
        assertThat(input.normalized()).isEqualTo("0912443882");
        assertThat(input.candidates()).singleElement().satisfies(candidate ->
                assertThat(candidate.aliases()).contains("0912443882", "+84912443882", "84912443882"));
        assertThat(input.masked()).isEqualTo("[NUMBER]");
        assertThat(input.hash()).hasSize(64);
    }

    @Test
    void preservesUrlPathCaseAndChecksExactHostWithoutTrustingSuffixes() {
        var input = processor.prepare(request("URL", "https://SHOPEE.vn.evil.example/Pay?order=123#section"));
        assertThat(input.normalized()).isEqualTo("shopee.vn.evil.example/Pay?order=123");
        assertThat(input.candidates()).extracting(ScamCheckInputProcessor.Candidate::value)
                .contains("shopee.vn.evil.example").doesNotContain("shopee.vn", "shopee.vn.evil.example/pay?order=123");
        assertThat(input.masked()).contains("order=[MASKED]");
    }

    @Test
    void extractsDistinctIndicatorsAndMasksContactInformation() {
        var input = processor.prepare(request("MESSAGE", "Gửi đến person@corp.example.com. "
                + "Mở https://evil.example/Pay. Gọi 0912443882 hoặc +84912443882; STK: 104889201992"));
        assertThat(input.candidates()).extracting(ScamCheckInputProcessor.Candidate::value)
                .contains("evil.example/Pay", "evil.example", "0912443882", "104889201992")
                .doesNotContain("corp.example.com", "example.com");
        assertThat(input.candidates().stream().filter(c -> c.type().equals("PHONE"))).hasSize(1);
        assertThat(input.masked()).doesNotContain("person@corp.example.com", "0912443882", "104889201992");
    }

    @Test
    void supportsLegacyRootUrlFormsWithoutAlteringSubdomains() {
        var input = processor.prepare(request("URL", "https://trusted.example/"));
        assertThat(input.candidates().getFirst().aliases())
                .contains("trusted.example", "https://trusted.example/", "http://trusted.example");
    }

    @Test
    void rejectsInvalidStructuredInputAndUnsupportedImageUploads() {
        for (String value : new String[]{"javascript:alert(1)", "https://trusted.example@evil.example", "https://", "example.com:99999"}) {
            assertThatThrownBy(() -> processor.prepare(request("URL", value))).isInstanceOf(BadRequestException.class);
        }
        assertThatThrownBy(() -> processor.prepare(request("PHONE", "abc0912443882"))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> processor.prepare(request("SCREENSHOT", "base64"))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> processor.prepare(request("MESSAGE", " "))).isInstanceOf(BadRequestException.class);
    }

    @Test
    void boundsExtractionWorkInsteadOfSilentlyIgnoringAdditionalIndicators() {
        StringBuilder text = new StringBuilder();
        for (int i = 0; i < 60; i++) text.append("https://host").append(i).append(".example ");
        assertThatThrownBy(() -> processor.prepare(request("MESSAGE", text.toString()))).isInstanceOf(BadRequestException.class);
    }

    private ScamCheckRequest request(String type, String content) {
        ScamCheckRequest request = new ScamCheckRequest();
        request.setInputType(type);
        request.setContent(content);
        return request;
    }

    @Test
    void distinguishesAdjacentPhonesAndDoesNotTreatLabeledBankAccountAsPhone() {
        var input = processor.prepare(request("MESSAGE", "012345678 087654321; STK: 0912443882"));
        assertThat(input.candidates().stream().filter(c -> c.type().equals("PHONE")))
                .extracting(ScamCheckInputProcessor.Candidate::value).containsExactly("012345678", "087654321");
        assertThat(input.candidates().stream().filter(c -> c.type().equals("BANK_ACCOUNT")))
                .extracting(ScamCheckInputProcessor.Candidate::value).containsExactly("0912443882");
    }

    @Test
    void supportsDomainBankAndTranscriptInputsWithoutLowercasingMessageContent() {
        assertThat(processor.prepare(request("DOMAIN", "Example.COM")).normalized()).isEqualTo("example.com");
        assertThat(processor.prepare(request("BANK_ACCOUNT", "1048 8920 1992")).normalized()).isEqualTo("104889201992");
        assertThat(processor.prepare(request("CALL_TRANSCRIPT", "Tôi là Công An")).normalized()).isEqualTo("Tôi là Công An");
    }

    @Test
    void invalidPhoneLikeCodesInMessagesDoNotRejectTheCheckAndAttachedIdsAreMasked() {
        var input = processor.prepare(request("MESSAGE", "Mã 8491234567, CCCD001234567890"));
        assertThat(input.masked()).doesNotContain("001234567890");
        assertThat(input.candidates()).isEmpty();
    }
}
