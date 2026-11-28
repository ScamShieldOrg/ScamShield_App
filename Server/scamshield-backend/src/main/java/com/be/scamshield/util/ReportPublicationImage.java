package com.be.scamshield.util;

import com.be.scamshield.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.MemoryCacheImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;
import java.util.Locale;

public final class ReportPublicationImage {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    private static final int MAX_PIXELS = 24_000_000;
    private static final String INVALID_IMAGE = "Ảnh minh chứng không hợp lệ. Vui lòng dùng ảnh JPG hoặc PNG.";
    private static final String IMAGE_LIMIT = "Ảnh minh chứng vượt quá giới hạn 5 MB hoặc 24 megapixel.";

    private ReportPublicationImage() {}

    public static String toPreviewDataUrl(byte[] bytes) {
        try (var input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            ImageReader reader = openReader(input);
            try {
                String type = reader.getFormatName().toLowerCase(Locale.ROOT);
                return "data:image/" + type + ";base64," + Base64.getEncoder().encodeToString(bytes);
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new BadRequestException(INVALID_IMAGE);
        }
    }

    public static byte[] sanitize(MultipartFile file) {
        if (file == null || file.isEmpty()) throw new BadRequestException(INVALID_IMAGE);
        if (file.getSize() > MAX_BYTES) throw new BadRequestException(IMAGE_LIMIT);
        try (var upload = file.getInputStream();
             var input = new MemoryCacheImageInputStream(upload);
             var output = new ByteArrayOutputStream()) {
            ImageReader reader = openReader(input);
            try {
                BufferedImage source = reader.read(0);
                BufferedImage image = new BufferedImage(source.getWidth(), source.getHeight(), BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = image.createGraphics();
                try {
                    graphics.setColor(Color.WHITE);
                    graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
                    graphics.drawImage(source, 0, 0, null);
                } finally {
                    graphics.dispose();
                }
                if (!ImageIO.write(image, "jpeg", output)) throw new BadRequestException(INVALID_IMAGE);
                if (output.size() > MAX_BYTES) throw new BadRequestException(IMAGE_LIMIT);
                return output.toByteArray();
            } finally {
                reader.dispose();
            }
        } catch (IOException ex) {
            throw new BadRequestException(INVALID_IMAGE);
        }
    }

    private static ImageReader openReader(MemoryCacheImageInputStream input) throws IOException {
        var readers = ImageIO.getImageReaders(input);
        if (!readers.hasNext()) throw new BadRequestException(INVALID_IMAGE);
        ImageReader reader = readers.next();
        try {
            String format = reader.getFormatName().toLowerCase(Locale.ROOT);
            if (!"jpeg".equals(format) && !"png".equals(format)) throw new BadRequestException(INVALID_IMAGE);
            reader.setInput(input, true, true);
            if ((long) reader.getWidth(0) * reader.getHeight(0) > MAX_PIXELS) {
                throw new BadRequestException(IMAGE_LIMIT);
            }
            return reader;
        } catch (IOException | RuntimeException ex) {
            reader.dispose();
            throw ex;
        }
    }
}
