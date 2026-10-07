package com.satir.platform.security;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * HMAC-SHA256 of short-lived abuse/dedupe keys (e.g. a client address) so raw values are never
 * stored. Shares the server-side secret used for rate-limit buckets ({@code SATIR_RATE_LIMIT_KEY}).
 */
@Component
public class KeyedHash {

    private final SecretKeySpec key;

    KeyedHash(@Value("${satir.security.rate-limit-key}") String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("satir.security.rate-limit-key (SATIR_RATE_LIMIT_KEY) must be at least 32 characters");
        }
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public String hash(String purpose, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            return HexFormat.of().formatHex(mac.doFinal((purpose + '\u0000' + value).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
