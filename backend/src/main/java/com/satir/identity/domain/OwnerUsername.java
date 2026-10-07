package com.satir.identity.domain;

import java.util.Locale;
import java.util.regex.Pattern;

import com.satir.platform.validation.ValidationException;

/** Optional login alias reserved for the owner account; case-insensitive, stored lower-case. */
public final class OwnerUsername {

    private static final Pattern SHAPE = Pattern.compile("[a-z][a-z0-9_-]{2,31}");

    private OwnerUsername() {
    }

    public static String parse(String field, String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValidationException(field, "REQUIRED");
        }
        String normalized = raw.strip().toLowerCase(Locale.ROOT);
        if (!SHAPE.matcher(normalized).matches()) {
            throw new ValidationException(field, "FORMAT");
        }
        return normalized;
    }
}
