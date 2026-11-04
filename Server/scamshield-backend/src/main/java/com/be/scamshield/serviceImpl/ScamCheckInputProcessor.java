package com.be.scamshield.serviceImpl;

import com.be.scamshield.dto.request.ScamCheckRequest;
import com.be.scamshield.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.net.IDN;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class ScamCheckInputProcessor {
    private static final Pattern URL = Pattern.compile(
            "(?i)(?<![\\w@.])(?:https?://[^\\s<>\"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,63}(?:/[^\\s<>\"']*)?)");
    private static final Pattern PHONE = Pattern.compile(
            "(?<![\\w\\d])(?:(?:\\+84|84|0)[ .()-]*(?:[0-9][ .()-]*){7,9}[0-9]"
                    + "|(?:1900|1800)[ .()-]*(?:[0-9][ .()-]*){3,6}[0-9])(?![\\w\\d])");
    private static final Pattern BANK = Pattern.compile(
            "(?iu)(?:STK|số tài khoản|tài khoản ngân hàng)\\s*[:#-]?\\s*([0-9][0-9 .-]{4,30}[0-9])");

    public record Candidate(String type, String value, List<String> aliases, int start, int end) { }
    public record Prepared(String normalized, String masked, String hash, List<Candidate> candidates) { }

    public Prepared prepare(ScamCheckRequest request) {
        if (request == null || request.getContent() == null || request.getContent().isBlank()
                || request.getContent().length() > 10000 || request.getInputType() == null) {
            throw new BadRequestException("Nội dung kiểm tra phải có từ 1 đến 10.000 ký tự");
        }
        String normalized = Normalizer.normalize(request.getContent(), Normalizer.Form.NFC)
                .replace("\r\n", "\n").replace('\u00a0', ' ').strip();
        Map<String, Candidate> candidates = new LinkedHashMap<>();
        switch (request.getInputType()) {
            case "PHONE" -> {
                normalized = phone(normalized);
                addPhone(candidates, normalized, 0, normalized.length());
            }
            case "BANK_ACCOUNT" -> {
                normalized = normalized.replaceAll("[\\s.-]", "");
                if (!normalized.matches("[0-9]{6,30}")) {
                    throw new BadRequestException("Số tài khoản phải có từ 6 đến 30 chữ số");
                }
                add(candidates, "BANK_ACCOUNT", normalized, List.of(normalized), 0, normalized.length());
            }
            case "DOMAIN", "URL" -> normalized = addUrl(candidates, normalized, 0,
                    normalized.length(), "DOMAIN".equals(request.getInputType()));
            case "MESSAGE", "CALL_TRANSCRIPT" -> extract(normalized, candidates);
            default -> throw new BadRequestException("Loại nội dung kiểm tra chưa được hỗ trợ");
        }
        String masked = mask(normalized);
        return new Prepared(normalized, masked, sha256(request.getInputType() + ":" + normalized),
                List.copyOf(candidates.values()));
    }

    private void extract(String text, Map<String, Candidate> candidates) {
        Matcher urls = URL.matcher(text);
        List<int[]> urlRanges = new ArrayList<>();
        while (urls.find()) {
            String token = urls.group().replaceAll("[.,;:!?)}\\]]+$", "");
            urlRanges.add(new int[]{urls.start(), urls.end()});
            // A malformed URL embedded in prose should not prevent checking the other indicators.
            try {
                addUrl(candidates, token, urls.start(), urls.start() + token.length(), false);
            } catch (BadRequestException ignored) {
                // It remains in masked input for the future AI stage.
            }
        }
        Matcher banks = BANK.matcher(text);
        while (banks.find()) {
            String account = banks.group(1).replaceAll("[\\s.-]", "");
            if (account.matches("[0-9]{6,30}")) {
                add(candidates, "BANK_ACCOUNT", account, List.of(account), banks.start(1), banks.end(1));
                urlRanges.add(new int[]{banks.start(1), banks.end(1)});
            }
        }
        Matcher phones = PHONE.matcher(text);
        while (phones.find()) {
            if (urlRanges.stream().anyMatch(r -> phones.start() >= r[0] && phones.start() < r[1])) continue;
            try {
                addPhone(candidates, phone(phones.group()), phones.start(), phones.end());
            } catch (BadRequestException ignored) {
                // Prose can contain numeric codes that resemble, but are not, valid phone numbers.
            }
        }
        if (candidates.size() > 50) throw new BadRequestException("Mỗi lần kiểm tra chỉ hỗ trợ tối đa 50 chỉ số");
    }

    private String addUrl(Map<String, Candidate> candidates, String input, int start, int end, boolean domainOnly) {
        try {
            URI uri = URI.create(input.contains("://") ? input : "https://" + input);
            if (uri.getRawAuthority() == null || uri.getRawUserInfo() != null
                    || !("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))) {
                throw new IllegalArgumentException();
            }
            // IDN conversion makes Unicode and ASCII host representations use the same key.
            String authority = uri.getRawAuthority();
            int colon = authority.lastIndexOf(':');
            int port = colon < 0 ? -1 : Integer.parseInt(authority.substring(colon + 1));
            String host = IDN.toASCII(colon < 0 ? authority : authority.substring(0, colon), IDN.USE_STD3_ASCII_RULES)
                    .toLowerCase(Locale.ROOT).replaceAll("\\.$", "");
            if (host.length() > 253 || !host.contains(".") || port > 65535 || port < -1
                    || (domainOnly && (colon >= 0 || uri.getRawQuery() != null || uri.getRawFragment() != null
                    || (uri.getRawPath() != null && !uri.getRawPath().isEmpty() && !uri.getRawPath().equals("/"))))) {
                throw new IllegalArgumentException();
            }
            String path = uri.getRawPath() == null ? "" : uri.getRawPath();
            if ("/".equals(path) && uri.getRawQuery() == null) path = "";
            String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
            boolean defaultPort = port == -1 || (port == 80 && scheme.equals("http"))
                    || (port == 443 && scheme.equals("https"));
            String key = host + (defaultPort ? "" : ":" + port) + path
                    + (uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery());
            if (key.length() > 500) throw new IllegalArgumentException();
            LinkedHashSet<String> aliases = new LinkedHashSet<>(List.of(key, scheme + "://" + key));
            if (path.isEmpty() && uri.getRawQuery() == null) {
                aliases.add(key + "/");
                aliases.add(scheme + "://" + key + "/");
            }
            add(candidates, "URL", key, List.copyOf(aliases), start, end);
            // Legacy data stores some domain-wide entries as URL rather than DOMAIN.
            if (defaultPort) {
                add(candidates, "URL", host, List.of(host, "https://" + host, "http://" + host,
                        host + "/", "https://" + host + "/", "http://" + host + "/"), start, end);
                add(candidates, "DOMAIN", host, List.of(host), start, end);
            }
            return domainOnly ? host : key;
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Tên miền hoặc URL HTTP/HTTPS không hợp lệ hoặc vượt quá 500 ký tự");
        }
    }

    private String phone(String input) {
        String value = input.replaceAll("[\\s().-]", "");
        if (value.startsWith("+84")) value = "0" + value.substring(3);
        else if (value.startsWith("84") && value.length() >= 11) value = "0" + value.substring(2);
        if (!value.matches("(?:0[0-9]{8,10}|1[89]00[0-9]{4,7})")) {
            throw new BadRequestException("Số điện thoại hoặc hotline Việt Nam không hợp lệ");
        }
        return value;
    }

    private void addPhone(Map<String, Candidate> candidates, String phone, int start, int end) {
        List<String> aliases = phone.startsWith("0")
                ? List.of(phone, "+84" + phone.substring(1), "84" + phone.substring(1)) : List.of(phone);
        add(candidates, "PHONE", phone, aliases, start, end);
    }

    private void add(Map<String, Candidate> candidates, String type, String value, List<String> aliases, int start, int end) {
        String key = type + ":" + value;
        Candidate previous = candidates.get(key);
        LinkedHashSet<String> merged = new LinkedHashSet<>(aliases);
        if (previous != null) merged.addAll(previous.aliases());
        candidates.put(key, new Candidate(type, value, List.copyOf(merged),
                previous == null ? start : previous.start(), previous == null ? end : previous.end()));
    }

    private String mask(String text) {
        return text.replaceAll("(?iu)[\\p{L}0-9._%+-]+@[\\p{L}0-9.-]+\\.[\\p{L}]{2,}", "[EMAIL]")
                .replaceAll("(?<!\\w)\\+?[0-9][0-9 .()-]{4,}[0-9](?!\\w)", "[NUMBER]")
                .replaceAll("[0-9]{6,}", "[NUMBER]")
                .replaceAll("([?&][^=\\s&]+)=[^&\\s]+", "$1=[MASKED]");
    }

    private String sha256(String text) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
