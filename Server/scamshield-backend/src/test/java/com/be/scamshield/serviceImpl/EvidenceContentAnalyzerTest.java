package com.be.scamshield.serviceImpl;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import com.be.scamshield.constant.EvidenceAnalysisStatus;
import com.be.scamshield.constant.ReportEvidenceType;
import com.be.scamshield.external.TesseractOcrClient;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.graphics.image.LosslessFactory;
import org.junit.jupiter.api.Test;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class EvidenceContentAnalyzerTest {
    private final EvidenceAnalysisProperties properties = new EvidenceAnalysisProperties();
    private final TesseractOcrClient ocr = mock(TesseractOcrClient.class);
    private final EvidenceContentAnalyzer analyzer = new EvidenceContentAnalyzer(properties, ocr);

    @Test
    void pdfTextLayerIsReadWithoutOcrAndPageLimitIsExplicit() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (PDDocument pdf = new PDDocument()) {
            for (int index = 0; index < 4; index++) {
                PDPage page = new PDPage(); pdf.addPage(page);
                try (PDPageContentStream stream = new PDPageContentStream(pdf, page)) {
                    stream.beginText(); stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 14);
                    stream.newLineAtOffset(30, 700); stream.showText("Transfer money to account 1234567890 for your reward."); stream.endText();
                }
            }
            pdf.save(bytes);
        }
        var result = analyzer.analyze(bytes.toByteArray(), ReportEvidenceType.PDF);
        assertThat(result.text()).contains("1234567890");
        assertThat(result.status()).isEqualTo(EvidenceAnalysisStatus.PARTIAL);
        assertThat(result.message()).isEqualTo("PDF_OR_TEXT_LIMIT");
        assertThat(result.perceptualHash()).isNull();
        verifyNoInteractions(ocr);
    }

    @Test
    void missingOcrDoesNotPreventImageFingerprintAndOversizedImagesAreBounded() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(30, 30, BufferedImage.TYPE_INT_RGB), "png", bytes);
        when(ocr.extract(any())).thenThrow(new IOException("missing engine"));
        assertThat(analyzer.analyze(bytes.toByteArray(), ReportEvidenceType.PNG).message()).isEqualTo("OCR_UNAVAILABLE");
        assertThatThrownBy(() -> analyzer.analyze(new byte[]{1, 2, 3}, ReportEvidenceType.PNG)).isInstanceOf(IOException.class);
    }

    @Test
    void scannedPdfIsRenderedAndPassedToOcr() throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(); document.addPage(page);
            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.drawImage(LosslessFactory.createFromImage(document, new BufferedImage(100, 100, BufferedImage.TYPE_INT_RGB)), 10, 10, 100, 100);
            }
            document.save(bytes);
        }
        when(ocr.extract(any())).thenReturn("Nội dung tin nhắn được đọc từ ảnh scan trong PDF");
        var result = analyzer.analyze(bytes.toByteArray(), ReportEvidenceType.PDF);
        assertThat(result.text()).contains("ảnh scan");
        assertThat(result.status()).isEqualTo(EvidenceAnalysisStatus.COMPLETED);
        verify(ocr).extract(any());
    }
}
