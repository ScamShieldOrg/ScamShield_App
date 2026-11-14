package com.be.scamshield.service;

public interface PartnerPasswordSetupService {
    void issue(Long partnerId);
    void setup(String token, String newPassword);
}
