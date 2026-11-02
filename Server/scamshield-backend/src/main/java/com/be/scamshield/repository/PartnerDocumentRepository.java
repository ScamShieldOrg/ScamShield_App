package com.be.scamshield.repository;

import com.be.scamshield.entity.PartnerDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.be.scamshield.dto.admin.PartnerDocumentMetadataResponse;
import java.util.List;
import java.util.Optional;

public interface PartnerDocumentRepository extends JpaRepository<PartnerDocument, Long> {
    @Query("SELECT new com.be.scamshield.dto.admin.PartnerDocumentMetadataResponse(d.id, d.documentType, d.fileName, d.contentType, d.fileSize) FROM PartnerDocument d WHERE d.partner.id = :partnerId ORDER BY d.id")
    List<PartnerDocumentMetadataResponse> findMetadataByPartnerId(@Param("partnerId") Long partnerId);

    @Query("SELECT d FROM PartnerDocument d WHERE d.id = :documentId AND d.partner.id = :partnerId")
    Optional<PartnerDocument> findByIdAndPartnerId(@Param("documentId") Long documentId,
                                                   @Param("partnerId") Long partnerId);
}
