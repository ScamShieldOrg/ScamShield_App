package com.be.scamshield.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "partner_documents")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerDocument {
    @jakarta.persistence.PrePersist
    void defaults() {
        if (storageStatus == null) storageStatus = "READY";
    }
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private PartnerProfile partner;

    @Column(nullable = false, length = 30)
    private String documentType;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false, length = 50)
    private String contentType;

    @Column(nullable = false)
    private Long fileSize;

    @Column(name = "storage_object_key", length = 1024)
    private String storageObjectKey;

    @Column(name = "storage_status", nullable = false, length = 16, columnDefinition = "varchar(16) default 'READY'")
    private String storageStatus;

    @Column(name = "storage_etag", length = 128)
    private String storageEtag;

    // Nullable during the transition for legacy rows; new registrations store bytes only transiently.
    @Column(columnDefinition = "bytea")
    private byte[] content;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
