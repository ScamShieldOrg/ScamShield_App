package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.BatchSize;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "abuse_flags")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AbuseFlag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "report_id")
    private Report report;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User createdBy;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "abuse_flag_reports",
            joinColumns = @JoinColumn(name = "abuse_flag_id"),
            inverseJoinColumns = @JoinColumn(name = "report_id"),
            uniqueConstraints = @UniqueConstraint(columnNames = {"abuse_flag_id", "report_id"}))
    @BatchSize(size = 100)
    @OrderBy("id ASC")
    @Builder.Default
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Report> relatedReports = new ArrayList<>();

    @Column(name = "flag_type", nullable = false)
    private String flagType;

    @Column(name = "severity", nullable = false)
    private String severity;

    @Column(name = "reason", columnDefinition = "text")
    private String reason;

    @Column(name = "evidence", columnDefinition = "text")
    private String evidence;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

    @Column(name = "resolved_at")
    private java.time.LocalDateTime resolvedAt;

}
