package com.be.scamshield.dto.admin;

public record PartnerDocumentContentResponse(Long id, String fileName, String contentType,
                                             Long fileSize, String contentBase64) { }
