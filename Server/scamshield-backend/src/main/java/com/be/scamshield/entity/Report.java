package com.be.scamshield.entity;

import com.be.scamshield.constant.VietnamProvince;
import com.be.scamshield.converter.VietnamProvinceConverter;
import jakarta.persistence.*;
import com.be.scamshield.constant.ReportStatus;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_user_id", nullable = false)
    private User reporterUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "indicator_id", nullable = false)
    private Indicator indicator;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_check_request_id")
    private CheckRequest sourceCheckRequest;

    @Column(name = "reported_message", columnDefinition = "text")
    private String reportedMessage;

    @Column(name = "description")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ReportStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private ScamCategory category;

    @Convert(converter = VietnamProvinceConverter.class)
    @Column(name = "region_code")
    private VietnamProvince regionCode;

    @Column(name = "ip_hash")
    private String ipHash;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

}
