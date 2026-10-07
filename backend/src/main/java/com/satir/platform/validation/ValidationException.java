package com.satir.platform.validation;

/**
 * Invalid user input detected by a domain rule (as opposed to Bean Validation on DTOs).
 * Rendered as 422 {@code VALIDATION_FAILED} with a single field error.
 */
public class ValidationException extends RuntimeException {

    private final String field;
    private final String code;

    public ValidationException(String field, String code) {
        super(field + ":" + code, null, false, false);
        this.field = field;
        this.code = code;
    }

    public String field() {
        return field;
    }

    public String code() {
        return code;
    }
}
