package com.be.scamshield.external;

import com.be.scamshield.config.EvidenceAnalysisProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class TesseractOcrClient {
    private final EvidenceAnalysisProperties properties;

    public String extract(BufferedImage image) throws IOException, InterruptedException {
        Path directory = Files.createTempDirectory("scamshield-ocr-");
        Process process = null;
        try {
            Path input = directory.resolve("input.png");
            Path output = directory.resolve("result");
            ImageIO.write(image, "png", input.toFile());
            List<String> command = new ArrayList<>(List.of(executable(), input.toString(), output.toString(),
                    "-l", properties.getLanguages(), "--oem", "1", "--psm", "3"));
            String data = tessdataDirectory();
            if (!data.isBlank()) command.addAll(List.of("--tessdata-dir", data));
            ProcessBuilder builder = new ProcessBuilder(command).redirectOutput(ProcessBuilder.Redirect.DISCARD)
                    .redirectError(ProcessBuilder.Redirect.DISCARD);
            builder.environment().put("OMP_THREAD_LIMIT", "1");
            process = builder.start();
            if (!process.waitFor(properties.getTimeoutSeconds(), TimeUnit.SECONDS)) {
                process.destroyForcibly(); process.waitFor(5, TimeUnit.SECONDS);
                throw new IOException("OCR_TIMEOUT");
            }
            if (process.exitValue() != 0) throw new IOException("OCR_UNAVAILABLE");
            try (var reader = Files.newBufferedReader(directory.resolve("result.txt"), StandardCharsets.UTF_8)) {
                char[] text = new char[properties.getMaxTextCharacters() + 1];
                int length = 0, read;
                while (length < text.length && (read = reader.read(text, length, text.length - length)) != -1) length += read;
                return new String(text, 0, Math.min(length, properties.getMaxTextCharacters()));
            }
        } finally {
            if (process != null && process.isAlive()) { process.destroyForcibly(); process.waitFor(5, TimeUnit.SECONDS); }
            try (var paths = Files.list(directory)) { for (Path path : paths.toList()) Files.deleteIfExists(path); }
            Files.deleteIfExists(directory);
        }
    }

    private String executable() {
        if (!"tesseract".equals(properties.getExecutable())) return properties.getExecutable();
        String programFiles = System.getenv("ProgramFiles");
        if (programFiles != null) {
            Path path = Path.of(programFiles, "Tesseract-OCR", "tesseract.exe");
            if (Files.isRegularFile(path)) return path.toString();
        }
        return "tesseract";
    }

    private String tessdataDirectory() {
        if (!properties.getTessdataDirectory().isBlank()) return properties.getTessdataDirectory();
        String local = System.getenv("LOCALAPPDATA");
        if (local != null) {
            Path path = Path.of(local, "ScamShield", "tessdata");
            if (Files.isRegularFile(path.resolve("vie.traineddata"))) return path.toString();
        }
        return "";
    }
}
