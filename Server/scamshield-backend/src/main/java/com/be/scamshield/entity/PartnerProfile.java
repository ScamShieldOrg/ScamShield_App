package com.be.scamshield.entity;

import com.be.scamshield.constant.PartnerVerificationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "partner_profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PartnerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User user;

    @Column(name = "legal_name", nullable = false)
    private String legalName;

    @Column(name = "brand_name", nullable = false)
    private String brandName;

    @Column(name = "partner_type", nullable = false)
    private String partnerType;

    // Nullable for profiles created before the registration form. New submissions require these fields.
    @Column(name = "tax_code", unique = true, length = 13)
    private String taxCode;

    @Column(name = "corporate_email", length = 254)
    private String corporateEmail;

    @Column(name = "representative_name_and_title")
    private String representativeNameAndTitle;

    @Column(name = "contact_phone", length = 30)
    private String contactPhone;

    @Column(name = "legal_representative")
    private Boolean legalRepresentative;

    @Column(name = "terms_accepted_at")
    private LocalDateTime termsAcceptedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private PartnerVerificationStatus verificationStatus;

    @Column(name = "business_verification_result", columnDefinition = "text")
    private String businessVerificationResult;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User verifiedByUser;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "official_domain", length = 253)
    private String officialDomain;

    @Column(name = "official_hotline", length = 30)
    private String officialHotline;

    @Column(name = "sms_brand_name", length = 100)
    private String smsBrandName;
}
