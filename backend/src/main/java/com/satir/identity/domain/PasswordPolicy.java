package com.satir.identity.domain;

import com.satir.platform.validation.ValidationException;

/**
 * Passwords are 12–128 Unicode code points. Nothing is trimmed or silently truncated: the exact
 * characters supplied are what gets hashed.
 */
public final class PasswordPolicy {

    public static final int MIN_LENGTH = 12;
    public static final int MAX_LENGTH = 128;

    private PasswordPolicy() {
    }

    public static void check(String field, char[] password) {
        if (password == null || password.length == 0) {
            throw new ValidationException(field, "REQUIRED");
        }
        int codePoints = Character.codePointCount(password, 0, password.length);
        if (codePoints < MIN_LENGTH || codePoints > MAX_LENGTH) {
            throw new ValidationException(field, "LENGTH");
        }
        boolean allWhitespace = true;
        for (char c : password) {
            if (!Character.isWhitespace(c)) {
                allWhitespace = false;
                break;
            }
        }
        if (allWhitespace) {
            throw new ValidationException(field, "FORMAT");
        }
    }
}
