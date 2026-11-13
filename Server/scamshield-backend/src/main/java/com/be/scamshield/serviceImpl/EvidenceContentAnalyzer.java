package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.external.TesseractOcrClient;
import com.be.scamshield.util.EvidenceFingerprints;
import lombok.RequiredArgsConstructor;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.rendering.ImageType;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import java.awt.image.BufferedImage;
import java.io.*;

@Service
@RequiredArgsConstructor
public class EvidenceContentAnalyzer {
    public record Result(Long perceptualHash, String text, EvidenceAnalysisStatus status, String message) { }
    private final EvidenceAnalysisProperties properties;
    private final TesseractOcrClient ocr;

    public Result analyze(byte[] bytes, ReportEvidenceType type) throws IOException, InterruptedException {
        if (bytes.length == 0 || bytes.length > properties.getMaxFileMegabytes() * 1024L * 1024L) {
            throw new IOException("FILE_SIZE_LIMIT");
        }
        if (type == ReportEvidenceType.PDF) return pdf(bytes);
        BufferedImage image = readImage(bytes);
        Long hash = EvidenceFingerprints.perceptualHash(image);
        try {
            String text = ocr.extract(image);
            boolean limited = text.length() >= properties.getMaxTextCharacters();
            return new Result(hash, text, limited ? EvidenceAnalysisStatus.PARTIAL : EvidenceAnalysisStatus.COMPLETED,
                    limited ? "TEXT_LIMIT" : text.isBlank() ? "NO_TEXT" : "OK");
        } catch (IOException exception) {
            return new Result(hash, "", EvidenceAnalysisStatus.PARTIAL,
                    "OCR_TIMEOUT".equals(exception.getMessage()) ? "OCR_TIMEOUT" : "OCR_UNAVAILABLE");
        }
    }

    private BufferedImage readImage(byte[] bytes) throws IOException {
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new IOException("INVALID_IMAGE");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width <= 0 || height <= 0 || (long) width * height > properties.getMaxImageMegapixels() * 1_000_000L) {
                    throw new IOException("IMAGE_PIXEL_LIMIT");
                }
                var parameters = reader.getDefaultReadParam();
                int sample = Math.max(1, (int) Math.ceil(Math.max(width, height) / 2200.0));
                parameters.setSourceSubsampling(sample, sample, 0, 0);
                return reader.read(0, parameters);
            } finally { reader.dispose(); }
        }
    }

    private Result pdf(byte[] bytes) throws IOException, InterruptedException {
        try (PDDocument document = Loader.loadPDF(bytes)) {
            int pages = Math.min(document.getNumberOfPages(), properties.getMaxPdfPages());
            boolean limited = document.getNumberOfPages() > pages;
            boolean ocrFailed = false;
            StringBuilder text = new StringBuilder();
            PDFRenderer renderer = new PDFRenderer(document);
            renderer.setSubsamplingAllowed(true);
            for (int page = 0; page < pages && text.length() < properties.getMaxTextCharacters(); page++) {
                LimitedWriter writer = new LimitedWriter(properties.getMaxTextCharacters() - text.length());
                PDFTextStripper stripper = new PDFTextStripper();
                stripper.setStartPage(page + 1); stripper.setEndPage(page + 1);
                try { stripper.writeText(document, writer); } catch (TextLimitException exception) { limited = true; }
                String pageText = writer.text.toString();
                if (EvidenceFingerprints.normalizeText(pageText).length() < 20) {
                    var box = document.getPage(page).getCropBox();
                    double area = (double) box.getWidth() * box.getHeight();
                    if (!Double.isFinite(area) || area <= 0) throw new IOException("INVALID_PDF_DIMENSIONS");
                    float scale = (float) Math.min(150.0 / 72, Math.sqrt(4_000_000.0 / area));
                    try { pageText = ocr.extract(renderer.renderImage(page, scale, ImageType.RGB)); }
                    catch (IOException exception) { ocrFailed = true; }
                }
                int remaining = properties.getMaxTextCharacters() - text.length();
                if (pageText.length() > remaining) { pageText = pageText.substring(0, remaining); limited = true; }
                text.append(pageText);
                if (text.length() < properties.getMaxTextCharacters()) text.append('\n');
            }
            if (text.length() >= properties.getMaxTextCharacters()) limited = true;
            return new Result(null, text.toString(), limited || ocrFailed ? EvidenceAnalysisStatus.PARTIAL : EvidenceAnalysisStatus.COMPLETED,
                    ocrFailed ? "OCR_UNAVAILABLE" : limited ? "PDF_OR_TEXT_LIMIT" : text.toString().isBlank() ? "NO_TEXT" : "OK");
        }
    }

    private static class TextLimitException extends IOException { }
    private static class LimitedWriter extends Writer {
        private final StringBuilder text = new StringBuilder();
        private final int limit;
        LimitedWriter(int limit) { this.limit = limit; }
        @Override public void write(char[] chars, int offset, int length) throws IOException {
            int count = Math.min(length, limit - text.length());
            if (count > 0) text.append(chars, offset, count);
            if (count < length) throw new TextLimitException();
        }
        @Override public void flush() { }
        @Override public void close() { }
    }
}
