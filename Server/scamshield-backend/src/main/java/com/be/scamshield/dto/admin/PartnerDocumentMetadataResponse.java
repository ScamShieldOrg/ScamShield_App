package com.be.scamshield.dto.admin;

public record PartnerDocumentMetadataResponse(Long id, String documentType, String fileName,
                                              String contentType, Long fileSize) { }
