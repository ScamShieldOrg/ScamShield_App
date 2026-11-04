package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "check_verdict_reasons", uniqueConstraints =
        @UniqueConstraint(columnNames = {"verdict_id", "reason_code"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckVerdictReason {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "verdict_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private CheckVerdict verdict;

    @Column(name = "reason_code", nullable = false, length = 100)
    private String reasonCode;

    @Column(name = "source_stage", nullable = false, length = 30)
    private String sourceStage;

    @Column(length = 500)
    private String detail;
}
