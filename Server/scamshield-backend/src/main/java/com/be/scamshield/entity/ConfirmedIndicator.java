package com.be.scamshield.entity;

import com.be.scamshield.constant.ConfirmedIndicatorStatus;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "confirmed_indicators")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConfirmedIndicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_id", unique = true, nullable = false)
    private Indicator indicator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ScamCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "impersonated_partner_id")
    private PartnerProfile impersonatedPartner;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ConfirmedIndicatorStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "confirmed_by", nullable = false)
    private User confirmedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_report_id")
    private Report sourceReport;

    @Column(name = "confirmed_at", nullable = false)
    private java.time.LocalDateTime confirmedAt;

    @Column(name = "retracted_at")
    private java.time.LocalDateTime retractedAt;

    @Column(name = "retraction_reason")
    private String retractionReason;

    @Column(name = "public_reason")
    private String publicReason;

}
