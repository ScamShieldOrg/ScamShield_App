package com.be.scamshield.config;

import com.be.scamshield.constant.IndicatorType;
import com.be.scamshield.constant.PartnerVerificationStatus;
import com.be.scamshield.constant.WhitelistVerificationStatus;
import com.be.scamshield.entity.*;
import com.be.scamshield.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@Order(10)
@RequiredArgsConstructor
@Slf4j
public class PartnerWhitelistDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PartnerProfileRepository partnerProfileRepository;
    private final IndicatorRepository indicatorRepository;
    private final WhitelistEntryRepository whitelistEntryRepository;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            ensurePartnerWhitelisted(
                    "security@vietcombank.com.vn",
                    "0900545413",
                    "Ban An Ninh Thông Tin Vietcombank",
                    "Ngân hàng TMCP Ngoại thương Việt Nam",
                    "Vietcombank",
                    "vietcombank.com.vn",
                    "1900545413",
                    "VIETCOMBANK"
            );

            ensurePartnerWhitelisted(
                    "security@techcombank.com.vn",
                    "0900588822",
                    "Ban An Ninh Thông Tin Techcombank",
                    "Ngân hàng TMCP Kỹ Thương Việt Nam",
                    "Techcombank",
                    "techcombank.com.vn",
                    "1800588822",
                    "TECHCOMBANK"
            );
        } catch (Exception e) {
            log.warn("PartnerWhitelistDataInitializer: could not seed default partner whitelists: {}", e.getMessage());
        }
    }

    private void ensurePartnerWhitelisted(
            String email,
            String phone,
            String userFullName,
            String legalName,
            String brandName,
            String officialDomain,
            String officialHotline,
            String smsBrandName
    ) {
        LocalDateTime now = LocalDateTime.now();

        // 1. Indicator for domain
        Indicator domainIndicator = indicatorRepository.findByTypeAndNormalizedValue(IndicatorType.URL, officialDomain)
                .orElseGet(() -> indicatorRepository.save(Indicator.builder()
                        .type(IndicatorType.URL)
                        .normalizedValue(officialDomain)
                        .displayValue(officialDomain)
                        .firstSeenAt(now)
                        .lastSeenAt(now)
                        .createdAt(now)
                        .updatedAt(now)
                        .build()));

        // 2. Indicator for hotline
        Indicator phoneIndicator = indicatorRepository.findByTypeAndNormalizedValue(IndicatorType.PHONE, officialHotline)
                .orElseGet(() -> indicatorRepository.save(Indicator.builder()
                        .type(IndicatorType.PHONE)
                        .normalizedValue(officialHotline)
                        .displayValue(officialHotline)
                        .firstSeenAt(now)
                        .lastSeenAt(now)
                        .createdAt(now)
                        .updatedAt(now)
                        .build()));

        // 3. User
        User user = userRepository.findByEmail(email).orElseGet(() -> {
            Role role = roleRepository.findByName("BUSINESS_PARTNER").orElse(null);
            return userRepository.save(User.builder()
                    .email(email)
                    .phoneNumber(phone)
                    .fullName(userFullName)
                    .passwordHash("$2a$10$KjgQ5SG4mGFr37olOMAkxu4F4ekYORUUEleshwHskaOakgnZ.edu2")
                    .status("ACTIVE")
                    .role(role)
                    .reputationPoints(100)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        });

        // 4. PartnerProfile
        PartnerProfile profile = partnerProfileRepository.findByUserId(user.getId()).orElseGet(() ->
                partnerProfileRepository.save(PartnerProfile.builder()
                        .user(user)
                        .legalName(legalName)
                        .brandName(brandName)
                        .officialDomain(officialDomain)
                        .officialHotline(officialHotline)
                        .smsBrandName(smsBrandName)
                        .verificationStatus(PartnerVerificationStatus.VERIFIED)
                        .verifiedAt(now)
                        .createdAt(now)
                        .updatedAt(now)
                        .build())
        );

        // 5. Whitelist entries
        whitelistEntryRepository.findByIndicatorIdAndPartnerId(domainIndicator.getId(), profile.getId())
                .orElseGet(() -> whitelistEntryRepository.save(WhitelistEntry.builder()
                        .partner(profile)
                        .indicator(domainIndicator)
                        .verificationStatus(WhitelistVerificationStatus.VERIFIED)
                        .verifiedAt(now)
                        .autoLockModeration(true)
                        .createdAt(now)
                        .updatedAt(now)
                        .build()));

        whitelistEntryRepository.findByIndicatorIdAndPartnerId(phoneIndicator.getId(), profile.getId())
                .orElseGet(() -> whitelistEntryRepository.save(WhitelistEntry.builder()
                        .partner(profile)
                        .indicator(phoneIndicator)
                        .verificationStatus(WhitelistVerificationStatus.VERIFIED)
                        .verifiedAt(now)
                        .autoLockModeration(true)
                        .createdAt(now)
                        .updatedAt(now)
                        .build()));
    }
}

