package com.satir.platform.api;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Supplier;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Executes a POST command at most once per (principal, route, Idempotency-Key). The key row and the
 * command's database effects commit together; a retry with the same body replays the stored
 * response, a different body is 409. Failures roll back the key so a corrected retry can run.
 */
@Component
public class Idempotency {

    private static final Duration RETENTION = Duration.ofHours(24);

    private final JdbcClient jdbc;
    private final TransactionTemplate transactions;
    private final JsonMapper json;
    private final Clock clock;

    Idempotency(JdbcClient jdbc, TransactionTemplate transactions, JsonMapper json, Clock clock) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.json = json;
        this.clock = clock;
    }

    public static UUID requireKey(String header) {
        if (header == null || header.isBlank()) {
            throw new ApiException(HttpStatus.PRECONDITION_REQUIRED, "IDEMPOTENCY_KEY_REQUIRED", "İstek anahtarı gerekli");
        }
        try {
            return UUID.fromString(header.strip());
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "IDEMPOTENCY_KEY_INVALID", "İstek anahtarı geçersiz");
        }
    }

    public ResponseEntity<?> execute(String principalKey, String route, UUID key, Object request,
            Supplier<ResponseEntity<?>> command) {
        String hash = hash(request);
        Instant now = clock.instant();
        return transactions.execute(status -> {
            int inserted = jdbc.sql("""
                    INSERT INTO idempotency_record (principal_key, route, idem_key, request_hash, status, created_at, expires_at)
                    VALUES (:principal, :route, :key, :hash, 0, :now, :expires)
                    ON CONFLICT DO NOTHING
                    """)
                    .param("principal", principalKey).param("route", route).param("key", key).param("hash", hash)
                    .param("now", Timestamp.from(now)).param("expires", Timestamp.from(now.plus(RETENTION)))
                    .update();
            if (inserted == 0) {
                return replay(principalKey, route, key, hash);
            }
            ResponseEntity<?> response = command.get();
            jdbc.sql("""
                    UPDATE idempotency_record SET status = :status, body = CAST(:body AS jsonb)
                    WHERE principal_key = :principal AND route = :route AND idem_key = :key
                    """)
                    .param("status", response.getStatusCode().value())
                    .param("body", response.getBody() == null ? null : json.writeValueAsString(response.getBody()))
                    .param("principal", principalKey).param("route", route).param("key", key)
                    .update();
            return response;
        });
    }

    private ResponseEntity<?> replay(String principalKey, String route, UUID key, String hash) {
        record Stored(String hash, int status, String body, Instant expiresAt) {
        }
        // FOR UPDATE waits for a concurrent first execution to commit or roll back.
        Optional<Stored> stored = jdbc.sql("""
                SELECT request_hash, status, body::text AS body, expires_at FROM idempotency_record
                WHERE principal_key = :principal AND route = :route AND idem_key = :key FOR UPDATE
                """)
                .param("principal", principalKey).param("route", route).param("key", key)
                .query((rs, row) -> new Stored(rs.getString("request_hash"), rs.getInt("status"), rs.getString("body"),
                        rs.getTimestamp("expires_at").toInstant()))
                .optional();
        Stored record = stored.orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_IN_PROGRESS", "İstek hâlâ işleniyor"));
        if (!record.hash().equals(hash)) {
            throw new ApiException(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED", "Bu istek anahtarı farklı bir istekte kullanıldı");
        }
        JsonNode body = record.body() == null ? null : json.readTree(record.body());
        return ResponseEntity.status(record.status()).header("Idempotent-Replayed", "true").body(body);
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    @Transactional
    public void purgeExpired() {
        jdbc.sql("DELETE FROM idempotency_record WHERE expires_at <= :now")
                .param("now", Timestamp.from(clock.instant())).update();
    }

    private String hash(Object request) {
        try {
            byte[] bytes = request == null ? new byte[0] : json.writeValueAsBytes(request);
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
