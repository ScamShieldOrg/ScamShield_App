package com.be.scamshield.external;

import com.be.scamshield.config.PartnerBusinessVerificationProperties;
import com.be.scamshield.dto.BusinessRegistryLookup;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class XinvoiceBusinessClient {
    private final RestClient businessVerificationRestClient;
    private final PartnerBusinessVerificationProperties properties;

    public BusinessRegistryLookup lookup(String normalizedTaxCode) {
        var config = properties.getXinvoice();
        boolean hasClientId = !config.getClientId().isBlank();
        boolean hasApiKey = !config.getApiKey().isBlank();
        if (config.getBaseUrl().isBlank() || hasClientId != hasApiKey) {
            return BusinessRegistryLookup.unavailable(SourceStatus.NOT_CONFIGURED);
        }
        if (!normalizedTaxCode.matches("[0-9]{10}([0-9]{3})?")) {
            throw new IllegalArgumentException("Mã số thuế không đúng định dạng");
        }
        // Our database stores 13 digits; the registry uses the branch separator.
        String providerTaxCode = normalizedTaxCode.length() == 13
                ? normalizedTaxCode.substring(0, 10) + "-" + normalizedTaxCode.substring(10) : normalizedTaxCode;
        try {
            URI uri = UriComponentsBuilder.fromUriString(config.getBaseUrl())
                    .pathSegment("gdt-api", "tax-payer", providerTaxCode).build().toUri();
            TaxPayer response = businessVerificationRestClient.get().uri(uri)
                    .accept(MediaType.APPLICATION_JSON)
                    .headers(headers -> {
                        // The public tax-payer endpoint currently accepts unauthenticated requests.
                        // Send credentials only when the complete optional pair is configured.
                        if (hasClientId) {
                            headers.set("client-id", config.getClientId());
                            headers.set("api-key", config.getApiKey());
                        }
                    })
                    .retrieve().body(TaxPayer.class);
            if (response == null || response.taxID() == null || response.taxID().isBlank()
                    || response.name() == null || response.name().isBlank()) {
                return BusinessRegistryLookup.unavailable(SourceStatus.UNAVAILABLE);
            }
            return new BusinessRegistryLookup(SourceStatus.SUCCESS, response.taxID(), response.name(),
                    response.status(), response.updatedAt());
        } catch (HttpClientErrorException ex) {
            return BusinessRegistryLookup.unavailable(ex.getStatusCode().value() == 404
                    ? SourceStatus.NOT_FOUND : SourceStatus.UNAVAILABLE);
        } catch (RestClientException | IllegalArgumentException ex) {
            // Never return provider response bodies or credentials to callers.
            return BusinessRegistryLookup.unavailable(SourceStatus.UNAVAILABLE);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaxPayer(String taxID, String name, String status, String updatedAt) { }
}
