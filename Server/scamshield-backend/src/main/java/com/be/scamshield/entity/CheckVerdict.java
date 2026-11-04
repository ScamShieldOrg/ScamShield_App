package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "check_verdicts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckVerdict {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "check_request_id", nullable = false, unique = true)
    private CheckRequest checkRequest;

    @Column(nullable = false, length = 30)
    private String verdict;

    @Column(name = "decided_by_stage", nullable = false, length = 30)
    private String decidedByStage;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "matched_indicator_id")
    private Indicator matchedIndicator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "primary_category_id")
    private ScamCategory primaryCategory;

    @Column(precision = 6, scale = 5)
    private BigDecimal confidence;

    @Column(name = "risk_score", precision = 5, scale = 2)
    private BigDecimal riskScore;

    @Column(columnDefinition = "text")
    private String explanation;

    @Column(name = "safety_guidance", columnDefinition = "text")
    private String safetyGuidance;

    @Column(name = "unknown_reason", length = 50)
    private String unknownReason;

    @Column(name = "ai_snapshot", columnDefinition = "text")
    private String aiSnapshot;

    @Builder.Default
    @Column(name = "flagged_for_review", nullable = false)
    private Boolean flaggedForReview = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Builder.Default
    @OneToMany(mappedBy = "verdict", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<CheckVerdictReason> reasons = new ArrayList<>();
}
