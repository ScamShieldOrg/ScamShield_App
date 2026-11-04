package com.be.scamshield.external;

import com.be.scamshield.config.PartnerBusinessVerificationProperties;
import com.be.scamshield.dto.BusinessDocumentOcr;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.ExtractedBusiness;
import com.be.scamshield.dto.response.PartnerBusinessVerificationResponse.SourceStatus;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.util.UriComponentsBuilder;
import tools.jackson.databind.JsonNode;

@Service
@RequiredArgsConstructor
public class BusinessLicenseOcrClient {
    private final RestClient businessVerificationRestClient;
    private final PartnerBusinessVerificationProperties properties;

    public BusinessDocumentOcr extract(byte[] pdf, String fileName) {
        var config = properties.getOcr();
        if (!config.isEnabled()) {
            return BusinessDocumentOcr.unavailable(SourceStatus.DISABLED);
        }
        if (config.getUrl().isBlank() || config.getApiKey().isBlank() || config.getApiSecret().isBlank()) {
            return BusinessDocumentOcr.unavailable(SourceStatus.NOT_CONFIGURED);
        }
        try {
            URI uri = UriComponentsBuilder.fromUriString(config.getUrl())
                    .queryParam("format_type", "file").queryParam("get_thumb", false).build().toUri();
            MultipartBodyBuilder body = new MultipartBodyBuilder();
            body.part("img", new ByteArrayResource(pdf) {
                @Override
                public String getFilename() { return fileName; }
            }).contentType(MediaType.APPLICATION_PDF);
            JsonNode response = businessVerificationRestClient.post().uri(uri)
                    .headers(headers -> headers.setBasicAuth(config.getApiKey(), config.getApiSecret()))
                    .contentType(MediaType.MULTIPART_FORM_DATA).accept(MediaType.APPLICATION_JSON)
                    .body(body.build()).retrieve().body(JsonNode.class);
            if (response == null || !response.hasNonNull("errorCode")) {
                return BusinessDocumentOcr.unavailable(SourceStatus.UNAVAILABLE);
            }
            String errorCode = response.get("errorCode").asString();
            if (!"0".equals(errorCode)) {
                return BusinessDocumentOcr.unavailable("1".equals(errorCode) || "3".equals(errorCode)
                        ? SourceStatus.UNREADABLE : SourceStatus.UNAVAILABLE);
            }
            List<ExtractedBusiness> businesses = new ArrayList<>();
            JsonNode data = response.get("data");
            if (data != null && data.isArray()) {
                for (JsonNode item : data) {
                    JsonNode type = item.get("type");
                    boolean isBusiness = type != null && ("business_registration".equals(type.asString(""))
                            || (type.isArray() && type.valueStream().anyMatch(value -> "business_registration".equals(value.asString("")))));
                    if (!isBusiness) { continue; }
                    JsonNode info = item.get("info");
                    if (info != null && info.isArray()) {
                        for (JsonNode page : info) { addBusiness(businesses, page); }
                    } else { addBusiness(businesses, info); }
                }
            }
            return businesses.isEmpty() ? BusinessDocumentOcr.unavailable(SourceStatus.UNREADABLE)
                    : new BusinessDocumentOcr(SourceStatus.SUCCESS, List.copyOf(businesses));
        } catch (RestClientException | IllegalArgumentException ex) {
            return BusinessDocumentOcr.unavailable(SourceStatus.UNAVAILABLE);
        }
    }

    private void addBusiness(List<ExtractedBusiness> result, JsonNode info) {
        if (info == null || !info.isObject()) { return; }
        String name = text(info, "company_name");
        String taxCode = text(info, "business_code");
        if (name != null || taxCode != null) {
            // Explicitly select company fields; never extract representatives or owners.
            result.add(new ExtractedBusiness(name, taxCode, confidence(info, "company_name_confidence"),
                    confidence(info, "business_code_confidence")));
        }
    }

    private String text(JsonNode info, String field) {
        JsonNode value = info.get(field);
        return value != null && value.isString() && !value.asString().isBlank() ? value.asString() : null;
    }

    private Double confidence(JsonNode info, String field) {
        JsonNode value = info.get(field);
        if (value == null || !value.isNumber()) { return null; }
        double confidence = value.asDouble();
        return Double.isFinite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null;
    }
}
