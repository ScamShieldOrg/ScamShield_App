package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "quota_policies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuotaPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", unique = true, nullable = false)
    private String name;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rank_id")
    private ReputationRank rank;

    @Column(name = "max_checks_per_day")
    private Integer maxChecksPerDay;

    @Column(name = "max_reports_per_day")
    private Integer maxReportsPerDay;

    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private java.time.LocalDateTime updatedAt;

}
