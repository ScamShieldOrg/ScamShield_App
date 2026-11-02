package com.be.scamshield.util;

import com.be.scamshield.exception.BadRequestException;
import org.springframework.util.StringUtils;
import java.net.URI;
import java.util.Locale;

public final class ReportEvidenceTypeResolver {
    private ReportEvidenceTypeResolver() { }
    public static String resolveEvidenceType(String declaredType, String fileName, String fileUrl) {
        String declared = StringUtils.hasText(declaredType) ? declaredType.strip().toUpperCase(Locale.ROOT) : null;
        if (declared != null) {
            declared = switch (declared) {
                case "JPEG" -> "JPG";
                case "JPG", "PNG", "PDF" -> declared;
                default -> throw new BadRequestException("Loại minh chứng chỉ được là JPG, PNG hoặc PDF");
            };
        }
        String name = fileName;
        if (!StringUtils.hasText(name) && StringUtils.hasText(fileUrl)) {
            try {
                name = URI.create(fileUrl).getPath();
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("URL minh chứng không hợp lệ");
            }
        }
        String detected = detectEvidenceType(name);
        if (StringUtils.hasText(fileName) && detected == null) {
            throw new BadRequestException("Tệp minh chứng chỉ hỗ trợ JPG, PNG hoặc PDF");
        }
        if (declared != null && detected != null && !declared.equals(detected)) {
            throw new BadRequestException("Loại minh chứng không khớp định dạng tệp");
        }
        if (detected == null && declared == null) {
            throw new BadRequestException("Không xác định được định dạng minh chứng; cần tên tệp hoặc evidenceType JPG, PNG, PDF");
        }
        return detected != null ? detected : declared;
    }

    private static String detectEvidenceType(String filename) {
        if (!StringUtils.hasText(filename)) return null;
        String lower = filename.strip().toLowerCase(Locale.ROOT);
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "JPG";
        if (lower.endsWith(".png")) return "PNG";
        if (lower.endsWith(".pdf")) return "PDF";
        return null;
    }

}
