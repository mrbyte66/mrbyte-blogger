package com.satir.identity.domain;

import com.satir.platform.validation.ValidationException;

/** Account display name: trimmed, 1–80 characters (same limit as the frontend profile form). */
public final class DisplayName {

    private static final int MAX_LENGTH = 80;

    private DisplayName() {
    }

    public static String parse(String field, String raw) {
        if (raw == null || raw.isBlank()) {
            throw new ValidationException(field, "REQUIRED");
        }
        String trimmed = raw.strip();
        if (trimmed.codePointCount(0, trimmed.length()) > MAX_LENGTH) {
            throw new ValidationException(field, "LENGTH");
        }
        return trimmed;
    }
}
