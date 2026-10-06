package com.satir.library.domain;

import java.util.Locale;

import com.satir.platform.validation.ValidationException;

/**
 * A personal collection name: trimmed, inner whitespace collapsed, 1–60 characters. Uniqueness per
 * account uses the Turkish lower-case form, so "Şiir" and "şiir" are the same collection.
 */
public record CollectionName(String value, String normalized) {

    public static final String DEFAULT = "Genel";
    public static final int MAX_LENGTH = 60;
    private static final Locale TURKISH = Locale.forLanguageTag("tr");

    public static CollectionName of(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValidationException("name", "REQUIRED");
        }
        String clean = raw.strip().replaceAll("\\s+", " ");
        if (clean.codePointCount(0, clean.length()) > MAX_LENGTH || clean.chars().anyMatch(Character::isISOControl)) {
            throw new ValidationException("name", "LENGTH");
        }
        return new CollectionName(clean, clean.toLowerCase(TURKISH));
    }
}
