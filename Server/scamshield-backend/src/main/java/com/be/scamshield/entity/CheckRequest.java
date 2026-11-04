package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "check_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "guest_session_id")
    private GuestSession guestSession;

    @Column(name = "input_type", nullable = false)
    private String inputType;

    @Column(name = "raw_input", columnDefinition = "text")
    private String rawInput;

    @Column(name = "normalized_input", columnDefinition = "text")
    private String normalizedInput;

    @Column(name = "masked_input", columnDefinition = "text")
    private String maskedInput;

    @Column(name = "input_hash")
    private String inputHash;

    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "ai_job_id", unique = true)
    private UUID aiJobId;

    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

    @Column(name = "completed_at")
    private java.time.LocalDateTime completedAt;

    @Column(name = "retention_expires_at")
    private java.time.LocalDateTime retentionExpiresAt;

}
