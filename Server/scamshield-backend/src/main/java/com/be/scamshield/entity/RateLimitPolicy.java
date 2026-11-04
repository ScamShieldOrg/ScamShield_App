package com.be.scamshield.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "rate_limit_policies")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateLimitPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", unique = true, nullable = false)
    private String name;

    @Column(name = "scope", nullable = false)
    private String scope;

    @Column(name = "max_requests", nullable = false)
    private Integer maxRequests;

    @Column(name = "window_seconds", nullable = false)
    private Integer windowSeconds;

    @Column(name = "enabled", nullable = false)
    private Boolean enabled;

    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private java.time.LocalDateTime updatedAt;

}
