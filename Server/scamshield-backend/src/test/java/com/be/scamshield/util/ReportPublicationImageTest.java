package com.be.scamshield.util;

import com.be.scamshield.exception.BadRequestException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ReportPublicationImageTest {
    @Test
    void reencodesImageWithoutRetainingTrailingSourceData() throws Exception {
        BufferedImage image = new BufferedImage(16, 16, BufferedImage.TYPE_INT_ARGB);
        image.setRGB(0, 0, Color.BLACK.getRGB());
        ByteArrayOutputStream png = new ByteArrayOutputStream();
        ImageIO.write(image, "png", png);
        byte[] fileBytes = Arrays.copyOf(png.toByteArray(), png.size() + 10);
        Arrays.fill(fileBytes, png.size(), fileBytes.length, (byte) 'x');

        byte[] sanitized = ReportPublicationImage.sanitize(
                new MockMultipartFile("publicImage", "image.png", "image/png", fileBytes));

        assertThat(ReportPublicationImage.toPreviewDataUrl(sanitized)).startsWith("data:image/jpeg;base64,");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(sanitized));
        assertThat(decoded.getWidth()).isEqualTo(16);
        assertThat(decoded.getHeight()).isEqualTo(16);
        assertThat(Arrays.copyOfRange(sanitized, sanitized.length - 2, sanitized.length))
                .containsExactly((byte) 0xff, (byte) 0xd9);
        assertThat(new Color(decoded.getRGB(15, 15)).getRed()).isGreaterThan(240);
    }

    @Test
    void rejectsFileNamesAndMimeTypesThatDoNotMatchImageBytes() {
        var fake = new MockMultipartFile("publicImage", "image.jpg", "image/jpeg", new byte[]{1, 2, 3});
        assertThatThrownBy(() -> ReportPublicationImage.sanitize(fake)).isInstanceOf(BadRequestException.class);
    }
}
