package com.satir.platform.api;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;

/**
 * A business/protocol failure that is safe to show to the client. {@code code} is the stable
 * machine-readable identifier from the API contract; {@code title} is user-facing Turkish text.
 * Extra properties (e.g. {@code suggestedSlug}) are added to the problem body.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final String title;
    private final Duration retryAfter;
    private final Map<String, Object> extras = new LinkedHashMap<>();

    public ApiException(HttpStatus status, String code, String title) {
        this(status, code, title, null);
    }

    public ApiException(HttpStatus status, String code, String title, Duration retryAfter) {
        super(code, null, false, false);
        this.status = status;
        this.code = code;
        this.title = title;
        this.retryAfter = retryAfter;
    }

    public ApiException with(String key, Object value) {
        extras.put(key, value);
        return this;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public String title() {
        return title;
    }

    public Duration retryAfter() {
        return retryAfter;
    }

    public Map<String, Object> extras() {
        return extras;
    }
}
