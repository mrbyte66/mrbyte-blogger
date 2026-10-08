package com.satir.platform.ratelimit;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Fixed-window counters persisted in PostgreSQL so limits survive restarts and are shared by every
 * request thread. Logical keys (identifier, client IP) are HMAC'ed before storage; raw values are
 * never written. Buckets expire after their window and are purged periodically.
 */
@Component
public class RateLimiter {

    public record Limit(String name, int maxEvents, Duration window) {
    }

    private final JdbcClient jdbc;
    private final Clock clock;
    private final SecretKeySpec key;

    RateLimiter(JdbcClient jdbc, Clock clock, @Value("${satir.security.rate-limit-key}") String secret) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("satir.security.rate-limit-key (SATIR_RATE_LIMIT_KEY) must be at least 32 characters");
        }
        this.jdbc = jdbc;
        this.clock = clock;
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    /** Returns how long the caller must wait if {@code subject} has exhausted {@code limit}, otherwise empty. */
    public Optional<Duration> blockedFor(Limit limit, String subject) {
        requireNoTransaction();
        Instant now = clock.instant();
        return jdbc.sql("SELECT count, expires_at FROM auth_rate_bucket WHERE key_hash = :key AND expires_at > :now")
                .param("key", hash(limit, subject))
                .param("now", Timestamp.from(now))
                .query((rs, row) -> rs.getInt("count") >= limit.maxEvents()
                        ? Optional.of(Duration.between(now, rs.getTimestamp("expires_at").toInstant()))
                        : Optional.<Duration>empty())
                .optional()
                .flatMap(result -> result);
    }

    /** Counts one event in its own single-statement commit, so a caller that fails afterwards still consumes quota. */
    public void record(Limit limit, String subject) {
        requireNoTransaction();
        Instant now = clock.instant();
        jdbc.sql("""
                INSERT INTO auth_rate_bucket (key_hash, window_start, count, expires_at)
                VALUES (:key, :now, 1, :expires)
                ON CONFLICT (key_hash) DO UPDATE SET
                    window_start = CASE WHEN auth_rate_bucket.expires_at <= EXCLUDED.window_start
                                        THEN EXCLUDED.window_start ELSE auth_rate_bucket.window_start END,
                    count        = CASE WHEN auth_rate_bucket.expires_at <= EXCLUDED.window_start
                                        THEN 1 ELSE auth_rate_bucket.count + 1 END,
                    expires_at   = CASE WHEN auth_rate_bucket.expires_at <= EXCLUDED.window_start
                                        THEN EXCLUDED.expires_at ELSE auth_rate_bucket.expires_at END
                """)
                .param("key", hash(limit, subject))
                .param("now", Timestamp.from(now))
                .param("expires", Timestamp.from(now.plus(limit.window())))
                .update();
    }

    @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT1M")
    @Transactional
    public void purgeExpired() {
        jdbc.sql("DELETE FROM auth_rate_bucket WHERE expires_at <= :now")
                .param("now", Timestamp.from(clock.instant()))
                .update();
    }

    /**
     * Limits are checked and counted before the caller opens its transaction. From inside one, a separate
     * commit needs a second pooled connection while the first is held, and enough simultaneous requests then
     * wait for the pool until it times out (#28); joining the caller's transaction instead would let a
     * rolled-back request take its quota back.
     */
    private static void requireNoTransaction() {
        if (TransactionSynchronizationManager.isActualTransactionActive()) {
            throw new IllegalStateException("RateLimiter must be called outside a transaction");
        }
    }

    private String hash(Limit limit, String subject) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(key);
            byte[] digest = mac.doFinal((limit.name() + '\u0000' + subject).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 unavailable", e);
        }
    }
}
