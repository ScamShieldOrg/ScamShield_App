package com.be.scamshield.entity;

import com.be.scamshield.constant.IndicatorType;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "indicators")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Indicator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private IndicatorType type;

    @Column(name = "normalized_value", nullable = false)
    private String normalizedValue;

    @Column(name = "display_value")
    private String displayValue;

    @Column(name = "first_seen_at")
    private java.time.LocalDateTime firstSeenAt;

    @Column(name = "last_seen_at")
    private java.time.LocalDateTime lastSeenAt;

    @Column(name = "created_at", nullable = false)
    private java.time.LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private java.time.LocalDateTime updatedAt;

}
