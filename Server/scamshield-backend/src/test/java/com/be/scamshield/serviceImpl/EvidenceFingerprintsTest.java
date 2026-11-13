package com.be.scamshield.serviceImpl;

import com.be.scamshield.util.EvidenceFingerprints;
import org.junit.jupiter.api.Test;
import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import static org.assertj.core.api.Assertions.*;

class EvidenceFingerprintsTest {
    @Test
    void resizedAndReencodedImagesHaveDifferentShaButSimilarPerceptualHash() throws Exception {
        BufferedImage original = new BufferedImage(800, 400, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = original.createGraphics();
        graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, 800, 400);
        graphics.setColor(Color.BLACK); graphics.setFont(new Font("SansSerif", Font.BOLD, 40));
        graphics.drawString("TRANSFER 1234567890", 40, 100); graphics.fillRect(40, 170, 300, 60);
        graphics.setColor(Color.GRAY); graphics.fillOval(500, 150, 150, 150); graphics.dispose();
        BufferedImage resized = new BufferedImage(400, 200, BufferedImage.TYPE_INT_RGB);
        Graphics2D reduced = resized.createGraphics(); reduced.drawImage(original, 0, 0, 400, 200, null); reduced.dispose();
        ByteArrayOutputStream png = new ByteArrayOutputStream(), jpg = new ByteArrayOutputStream();
        ImageIO.write(original, "png", png); ImageIO.write(resized, "jpg", jpg);
        assertThat(EvidenceFingerprints.sha256(png.toByteArray())).isNotEqualTo(EvidenceFingerprints.sha256(jpg.toByteArray()));
        long first = EvidenceFingerprints.perceptualHash(original);
        long second = EvidenceFingerprints.perceptualHash(ImageIO.read(new ByteArrayInputStream(jpg.toByteArray())));
        assertThat(Long.bitCount(first ^ second)).isLessThanOrEqualTo(10);
        assertThat(EvidenceFingerprints.perceptualHash(new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB))).isNull();
    }

    @Test
    void textComparisonNormalizesVietnameseAndFormattingButRejectsUnrelatedContent() {
        String first = "Tin nhắn yêu cầu chuyển tiền vào tài khoản 1234567890 để nhận phần thưởng. Không cung cấp mã OTP.";
        String same = "TIN NHAN YEU CAU CHUYEN TIEN VAO TAI KHOAN 1234567890 DE NHAN PHAN THUONG! KHONG CUNG CAP MA OTP";
        assertThat(EvidenceFingerprints.textSimilarity(first, same)).isEqualTo(1);
        assertThat(EvidenceFingerprints.simHash(EvidenceFingerprints.normalizeText(first)))
                .isEqualTo(EvidenceFingerprints.simHash(EvidenceFingerprints.normalizeText(same)));
        assertThat(EvidenceFingerprints.textSimilarity(first, "Hóa đơn mua hàng tại siêu thị ngày hôm nay đã thanh toán đầy đủ bằng tiền mặt")).isLessThan(0.5);
        assertThat(EvidenceFingerprints.textSimilarity("!!!", "???")).isZero();
    }
}
