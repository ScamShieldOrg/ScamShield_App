package com.be.scamshield.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ReportPrivacyProperties {
    private final String ipHashSecret;

    public ReportPrivacyProperties(@Value("${app.report.ip-hash-secret:${app.jwt.secret}}") String ipHashSecret) {
        this.ipHashSecret = ipHashSecret;
    }

    public String getIpHashSecret() {
        return ipHashSecret;
    }
}
