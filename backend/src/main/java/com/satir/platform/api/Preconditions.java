package com.satir.platform.api;

import org.springframework.http.HttpStatus;

/**
 * Optimistic concurrency over HTTP (API contract §1): writes carry {@code If-Match: "7"};
 * a missing header is 428, a stale one 412 so the client re-reads instead of overwriting.
 */
public final class Preconditions {

    private Preconditions() {
    }

    public static long requireVersion(String ifMatch) {
        if (ifMatch == null || ifMatch.isBlank()) {
            throw new ApiException(HttpStatus.PRECONDITION_REQUIRED, "VERSION_REQUIRED", "Sürüm bilgisi gerekli; sayfayı yenile");
        }
        String value = ifMatch.strip();
        if (value.startsWith("W/")) {
            value = value.substring(2);
        }
        if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException e) {
            throw new ApiException(HttpStatus.PRECONDITION_FAILED, "STALE_VERSION", "Bu kayıt başka bir yerde değişti; yeniden yükle");
        }
    }

    public static void check(long expected, long actual) {
        if (expected != actual) {
            throw stale();
        }
    }

    public static ApiException stale() {
        return new ApiException(HttpStatus.PRECONDITION_FAILED, "STALE_VERSION", "Bu kayıt başka bir yerde değişti; yeniden yükle");
    }

    public static String etag(long version) {
        return "\"" + version + "\"";
    }
}
