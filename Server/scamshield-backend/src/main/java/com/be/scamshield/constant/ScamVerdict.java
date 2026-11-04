package com.be.scamshield.constant;

/** Normalizes legacy stored and external labels at the public response boundary. */
public final class ScamVerdict {
    private ScamVerdict() { }

    public static String normalize(String value) {
        if (value == null) return "UNKNOWN";
        return switch (value) {
            case "SCAM_RISK", "SCAM-RISK", "DANGEROUS" -> "SCAM_RISK";
            case "LOW_RISK", "LOW-RISK", "SAFE" -> "LOW_RISK";
            default -> "UNKNOWN";
        };
    }
}
