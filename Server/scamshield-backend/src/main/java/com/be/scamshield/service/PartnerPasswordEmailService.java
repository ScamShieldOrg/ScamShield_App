package com.be.scamshield.service;

public interface PartnerPasswordEmailService {
    void send(Long partnerId, String email, String link, String tokenHash);
}
