package com.be.scamshield.serviceImpl;

import com.be.scamshield.external.BusinessLicenseOcrClient;
import com.be.scamshield.external.XinvoiceBusinessClient;

import com.be.scamshield.config.PartnerBusinessVerificationProperties;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.hamcrest.Matchers.containsString;

class BusinessVerificationClientsTest {
    private PartnerBusinessVerificationProperties properties;
    private MockRestServiceServer server;
    private XinvoiceBusinessClient registry;
    private BusinessLicenseOcrClient ocr;
    private static final String OCR_URL = "https://ocr.example.test/business_registration?format_type=file&get_thumb=false";

    @BeforeEach
    void setUp() {
        properties = new PartnerBusinessVerificationProperties();
        properties.getOcr().setEnabled(true);
        properties.getXinvoice().setClientId("test-client");
        properties.getXinvoice().setApiKey("test-registry-secret");
        properties.getOcr().setUrl("https://ocr.example.test/business_registration");
        properties.getOcr().setApiKey("test-ocr-key");
        properties.getOcr().setApiSecret("test-ocr-secret");
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        RestClient client = builder.build();
        registry = new XinvoiceBusinessClient(client, properties);
        ocr = new BusinessLicenseOcrClient(client, properties);
    }

    @Test
    void disabledOcrNeverMakesRequestEvenWithCredentialsPresent() {
        properties.getOcr().setEnabled(false);
        assertThat(ocr.extract(new byte[]{1}, "license.pdf").status()).isEqualTo(SourceStatus.DISABLED);
        server.verify();
    }

    @Test
    void looksUpBusinessWithoutCredentialsAndDoesNotSendEmptyAuthHeaders() {
        properties.getXinvoice().setClientId("");
        properties.getXinvoice().setApiKey("");
        server.expect(requestTo("https://api.xinvoice.vn/gdt-api/tax-payer/0101248141"))
                .andExpect(headerDoesNotExist("client-id")).andExpect(headerDoesNotExist("api-key"))
                .andRespond(withSuccess("""
                        {"taxID":"0101248141","name":"CÔNG TY CỔ PHẦN FPT","status":"NNT đang hoạt động"}
                        """, MediaType.APPLICATION_JSON));
        var result = registry.lookup("0101248141");
        assertThat(result.status()).isEqualTo(SourceStatus.SUCCESS);
        assertThat(result.legalName()).isEqualTo("CÔNG TY CỔ PHẦN FPT");
        server.verify();
    }

    @Test
    void usesDocumentedRegistryHeadersAndBranchFormat() {
        server.expect(requestTo("https://api.xinvoice.vn/gdt-api/tax-payer/0100112437-001"))
                .andExpect(method(HttpMethod.GET)).andExpect(header("client-id", "test-client"))
                .andExpect(header("api-key", "test-registry-secret"))
                .andRespond(withSuccess("""
                        {"taxID":"0100112437-001","name":"CÔNG TY ABC","status":"NNT đang hoạt động",
                         "updatedAt":"2026-10-27T00:00:00Z","address":"ignored"}
                        """, MediaType.APPLICATION_JSON));
        var result = registry.lookup("0100112437001");
        assertThat(result.status()).isEqualTo(SourceStatus.SUCCESS);
        assertThat(result.taxCode()).isEqualTo("0100112437-001");
        assertThat(result.businessStatus()).isEqualTo("NNT đang hoạt động");
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(ints = {401, 404, 429, 500})
    void translatesRegistryHttpFailuresWithoutTreatingOutageAsNotFound(int status) {
        server.expect(requestTo("https://api.xinvoice.vn/gdt-api/tax-payer/0100112437"))
                .andRespond(withStatus(HttpStatusCode.valueOf(status))
                        .body("provider credentials must never be exposed"));
        assertThat(registry.lookup("0100112437").status())
                .isEqualTo(status == 404 ? SourceStatus.NOT_FOUND : SourceStatus.UNAVAILABLE);
        server.verify();
    }

    @Test
    void distinguishesUnconfiguredAndMalformedResponses() {
        properties.getXinvoice().setApiKey("");
        properties.getOcr().setUrl("");
        assertThat(registry.lookup("0100112437").status()).isEqualTo(SourceStatus.NOT_CONFIGURED);
        assertThat(ocr.extract(new byte[0], "license.pdf").status()).isEqualTo(SourceStatus.NOT_CONFIGURED);
        server.verify();
        properties.getXinvoice().setApiKey("test");
        server.expect(requestTo("https://api.xinvoice.vn/gdt-api/tax-payer/0100112437"))
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
        assertThat(registry.lookup("0100112437").status()).isEqualTo(SourceStatus.UNAVAILABLE);
        server.verify();
    }

    @Test
    void uploadsPdfAndDiscardsRepresentativeAndNestedOwnerFields() {
        server.expect(requestTo(OCR_URL)).andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Basic dGVzdC1vY3Ita2V5OnRlc3Qtb2NyLXNlY3JldA=="))
                .andExpect(content().contentTypeCompatibleWith(MediaType.MULTIPART_FORM_DATA))
                .andExpect(content().string(containsString("filename=\"license.pdf\"")))
                .andExpect(content().string(containsString("%PDF-original")))
                .andRespond(withSuccess("""
                        {"errorCode":"0","data":[{"type":"business_registration","info":{
                         "company_name":"CÔNG TY ABC","business_code":"0100112437",
                         "company_name_confidence":0.99,"business_code_confidence":0.98,
                         "list_of_legal_representatives":[{"representative_name":"PRIVATE REPRESENTATIVE"}],
                         "business_owner":{"business_code":"1111111111"}}}]}
                        """, MediaType.APPLICATION_JSON));
        var result = ocr.extract("%PDF-original".getBytes(StandardCharsets.US_ASCII), "license.pdf");
        assertThat(result.status()).isEqualTo(SourceStatus.SUCCESS);
        assertThat(result.businesses()).hasSize(1);
        assertThat(result.businesses().getFirst().taxCode()).isEqualTo("0100112437");
        assertThat(result.toString()).doesNotContain("PRIVATE REPRESENTATIVE", "1111111111");
        server.verify();
    }

    @Test
    void acceptsNumericErrorCodeAndPageArrayButDoesNotUseOwnerAsCompany() {
        server.expect(requestTo(OCR_URL)).andRespond(withSuccess("""
                {"errorCode":0,"data":[{"type":["business_registration"],"info":[
                 {"company_name":"CÔNG TY ABC","company_name_confidence":0.99},
                 {"business_code":"0100112437","business_code_confidence":0.99},
                 {"business_owner":{"business_code":"1111111111"}}]}]}
                """, MediaType.APPLICATION_JSON));
        assertThat(ocr.extract(new byte[]{1}, "license.pdf").businesses()).hasSize(2);
        server.verify();
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{broken", "{\"errorCode\":\"4\"}", "{\"errorCode\":\"5\"}"})
    void malformedOrProviderErrorsCannotBecomeOcrSuccess(String response) {
        server.expect(requestTo(OCR_URL)).andRespond(withSuccess(response, MediaType.APPLICATION_JSON));
        assertThat(ocr.extract(new byte[]{1}, "license.pdf").status()).isEqualTo(SourceStatus.UNAVAILABLE);
        server.verify();
    }

    @Test
    void emptyResultIsUnreadableAndTimeoutIsUnavailable() {
        server.expect(requestTo(OCR_URL)).andRespond(withSuccess("{\"errorCode\":\"0\",\"data\":[]}", MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://api.xinvoice.vn/gdt-api/tax-payer/0100112437"))
                .andRespond(withException(new SocketTimeoutException("provider timeout")));
        assertThat(ocr.extract(new byte[]{1}, "license.pdf").status()).isEqualTo(SourceStatus.UNREADABLE);
        assertThat(registry.lookup("0100112437").status()).isEqualTo(SourceStatus.UNAVAILABLE);
        server.verify();
    }
}
