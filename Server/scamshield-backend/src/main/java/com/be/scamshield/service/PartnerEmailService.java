package com.be.scamshield.service;

public interface PartnerEmailService {
    void sendPassword(Long partnerId, String email, String link, String tokenHash);
    void sendRejection(Long partnerId, String email, String partnerName, String reason);
}
