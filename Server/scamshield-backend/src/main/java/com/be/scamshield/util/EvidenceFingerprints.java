package com.be.scamshield.util;

import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.*;

public final class EvidenceFingerprints {
    private EvidenceFingerprints() { }

    public static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException exception) { throw new IllegalStateException(exception); }
    }

    public static String normalizeText(String text) {
        if (text == null) return "";
        return Normalizer.normalize(text, Normalizer.Form.NFKD).replaceAll("\\p{M}+", "")
                .toLowerCase(Locale.ROOT).replace('đ', 'd').replaceAll("[^\\p{L}\\p{N}]+", " ").strip();
    }

    private static Set<String> shingles(String normalized) {
        String[] words = normalized.split(" +");
        Set<String> result = new HashSet<>();
        if (words.length < 3) { result.add(normalized); return result; }
        for (int i = 0; i + 2 < words.length; i++) result.add(words[i] + " " + words[i + 1] + " " + words[i + 2]);
        return result;
    }

    public static double textSimilarity(String first, String second) {
        if (first == null || first.isBlank() || second == null || second.isBlank()) return 0;
        String normalizedFirst = normalizeText(first), normalizedSecond = normalizeText(second);
        if (normalizedFirst.isBlank() || normalizedSecond.isBlank()) return 0;
        Set<String> left = shingles(normalizedFirst);
        Set<String> right = shingles(normalizedSecond);
        long common = left.stream().filter(right::contains).count();
        return (double) common / (left.size() + right.size() - common);
    }

    public static long simHash(String normalized) {
        int[] votes = new int[64];
        for (String shingle : shingles(normalized)) {
            long hash = Long.parseUnsignedLong(sha256(shingle.getBytes(StandardCharsets.UTF_8)).substring(0, 16), 16);
            for (int bit = 0; bit < 64; bit++) votes[bit] += ((hash >>> bit) & 1) == 1 ? 1 : -1;
        }
        long value = 0;
        for (int bit = 0; bit < 64; bit++) if (votes[bit] > 0) value |= 1L << bit;
        return value;
    }

    public static Long perceptualHash(BufferedImage image) {
        BufferedImage small = new BufferedImage(32, 32, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = small.createGraphics();
        try {
            graphics.setColor(Color.WHITE); graphics.fillRect(0, 0, 32, 32);
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.drawImage(image, 0, 0, 32, 32, null);
        } finally { graphics.dispose(); }
        double[][] pixels = new double[32][32];
        double sum = 0, sumSquares = 0;
        for (int x = 0; x < 32; x++) for (int y = 0; y < 32; y++) {
            int rgb = small.getRGB(x, y);
            double value = 0.299 * ((rgb >> 16) & 255) + 0.587 * ((rgb >> 8) & 255) + 0.114 * (rgb & 255);
            pixels[x][y] = value; sum += value; sumSquares += value * value;
        }
        if (sumSquares / 1024 - Math.pow(sum / 1024, 2) < 4) return null; // Blank images carry no useful visual fingerprint.
        double[] coefficients = new double[64];
        for (int u = 0; u < 8; u++) for (int v = 0; v < 8; v++) {
            double value = 0;
            for (int x = 0; x < 32; x++) for (int y = 0; y < 32; y++) {
                value += pixels[x][y] * Math.cos((2 * x + 1) * u * Math.PI / 64)
                        * Math.cos((2 * y + 1) * v * Math.PI / 64);
            }
            coefficients[u * 8 + v] = value;
        }
        double[] sorted = Arrays.copyOfRange(coefficients, 1, 64);
        Arrays.sort(sorted);
        double median = sorted[31];
        long hash = 0;
        for (int bit = 1; bit < 64; bit++) if (coefficients[bit] > median) hash |= 1L << bit;
        return hash;
    }
}
