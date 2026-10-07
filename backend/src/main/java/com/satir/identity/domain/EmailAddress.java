package com.satir.identity.domain;

import java.util.Locale;
import java.util.regex.Pattern;

import com.satir.platform.validation.ValidationException;

/**
 * An e-mail address as entered (trimmed) plus its uniqueness key (trimmed, lower-cased).
 * Provider-specific aliasing (Gmail dots, plus addressing) is deliberately not merged.
 */
public record EmailAddress(String value, String normalized) {

    private static final int MAX_LENGTH = 254;
    private static final Pattern SHAPE = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s.]+");

    public static EmailAddress parse(String field, String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValidationException(field, "REQUIRED");
        }
        String trimmed = raw.strip();
        if (trimmed.length() > MAX_LENGTH) {
            throw new ValidationException(field, "LENGTH");
        }
        if (!SHAPE.matcher(trimmed).matches()) {
            throw new ValidationException(field, "FORMAT");
        }
        return new EmailAddress(trimmed, normalize(trimmed));
    }

    /** Uniqueness/lookup key; also used for login identifiers so lookups match registration. */
    public static String normalize(String raw) {
        return raw.strip().toLowerCase(Locale.ROOT);
    }
}
