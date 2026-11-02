package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actorUser;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(name = "previous_value")
    private String previousValue;

    @Column(name = "new_value")
    private String newValue;

    @Column(name = "reason", nullable = false, columnDefinition = "text")
    private String reason;

    @Column(name = "ip_hash")
    private String ipHash;

    @Column(name = "request_id")
    private String requestId;

    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

}
