package com.satir.delivery.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.satir.platform.db.IdGenerator;

import tools.jackson.databind.json.JsonMapper;

/**
 * Enqueues a job inside the caller's transaction (MANDATORY), so the job exists exactly when the
 * business change committed. The dedupe key makes the same logical event enqueue only once.
 * Payloads hold identifiers only — never secrets, tokens or article bodies.
 */
@Component
public class Outbox {

    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final IdGenerator ids;
    private final Clock clock;

    Outbox(JdbcClient jdbc, JsonMapper json, IdGenerator ids, Clock clock) {
        this.jdbc = jdbc;
        this.json = json;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public boolean enqueue(String type, UUID aggregateId, long generation, String dedupeKey, Map<String, Object> payload) {
        Instant now = clock.instant();
        return jdbc.sql("""
                INSERT INTO outbox_job (id, type, aggregate_id, generation, dedupe_key, payload, state, available_at, created_at, updated_at)
                VALUES (:id, :type, :aggregate, :generation, :dedupe, CAST(:payload AS jsonb), 'PENDING', :now, :now, :now)
                ON CONFLICT (dedupe_key) DO NOTHING
                """)
                .param("id", ids.next()).param("type", type).param("aggregate", aggregateId)
                .param("generation", generation).param("dedupe", dedupeKey)
                .param("payload", json.writeValueAsString(payload)).param("now", Timestamp.from(now))
                .update() == 1;
    }
}
