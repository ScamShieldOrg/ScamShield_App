package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.external.TesseractOcrClient;
import com.be.scamshield.util.EvidenceFingerprints;
import org.junit.jupiter.api.Test;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import static org.assertj.core.api.Assertions.*;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

class TesseractLocalSmokeTest {
    @Test
    void installedEngineReadsVietnameseAndEnglishWithoutApiKeys() throws Exception {
        assumeTrue(Files.isRegularFile(Path.of("C:/Program Files/Tesseract-OCR/tesseract.exe")), "Local OCR engine not installed on this test machine");
        BufferedImage image = new BufferedImage(1400, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics(); graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, 1400, 400);
        graphics.setColor(Color.BLACK); graphics.setFont(new Font("Arial", Font.PLAIN, 44));
        graphics.drawString("Tin nhắn yêu cầu chuyển tiền", 50, 100);
        graphics.drawString("TRANSFER 1234567890", 50, 200); graphics.dispose();
        String result = new TesseractOcrClient(new EvidenceAnalysisProperties()).extract(image);
        assertThat(EvidenceFingerprints.normalizeText(result)).contains("chuyen tien", "1234567890");
    }
}
