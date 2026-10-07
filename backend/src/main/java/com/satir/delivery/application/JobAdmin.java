package com.satir.delivery.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;

/** Owner view of delivery jobs of given types, and manual retry of FAILED jobs. No payload bodies. */
@Service
public class JobAdmin {

    public record JobView(UUID id, String type, UUID aggregateId, long generation, String state, int attempts,
            String lastErrorCode, Instant availableAt, Instant createdAt, Instant updatedAt) {
    }

    private static final Set<String> STATES = Set.of("pending", "running", "done", "skipped", "failed");

    private final JdbcClient jdbc;
    private final Clock clock;

    JobAdmin(JdbcClient jdbc, Clock clock) {
        this.jdbc = jdbc;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<JobView> list(List<String> types, String state, int page, int size) {
        PageResponse.checkBounds(page, size);
        Map<String, Object> params = new HashMap<>();
        params.put("types", types);
        String where = " WHERE type IN (:types)";
        if (state != null && !state.isBlank()) {
            if (!STATES.contains(state)) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_FILTER", "Filtre geçersiz");
            }
            where += " AND state = :state";
            params.put("state", state.toUpperCase(Locale.ROOT));
        }
        long total = jdbc.sql("SELECT count(*) FROM outbox_job" + where).params(params).query(Long.class).single();
        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<JobView> items = jdbc.sql("""
                SELECT id, type, aggregate_id, generation, state, attempts, last_error_code, available_at, created_at, updated_at
                FROM outbox_job""" + where + " ORDER BY created_at DESC, id LIMIT :limit OFFSET :offset")
                .params(params)
                .query((rs, row) -> new JobView(rs.getObject("id", UUID.class), rs.getString("type"),
                        rs.getObject("aggregate_id", UUID.class), rs.getLong("generation"),
                        rs.getString("state").toLowerCase(Locale.ROOT), rs.getInt("attempts"), rs.getString("last_error_code"),
                        rs.getTimestamp("available_at").toInstant(), rs.getTimestamp("created_at").toInstant(),
                        rs.getTimestamp("updated_at").toInstant()))
                .list();
        return PageResponse.of(items, page, size, total, "created_desc");
    }

    /** FAILED → PENDING with a fresh attempt budget; same generation and dedupe key (eligibility re-checked). */
    @Transactional
    public void retry(UUID id, List<String> types) {
        int updated = jdbc.sql("""
                UPDATE outbox_job SET state = 'PENDING', attempts = 0, available_at = :now, last_error_code = NULL, updated_at = :now
                WHERE id = :id AND type IN (:types) AND state = 'FAILED'
                """)
                .param("id", id).param("types", types).param("now", Timestamp.from(clock.instant())).update();
        if (updated == 0) {
            boolean exists = jdbc.sql("SELECT EXISTS (SELECT 1 FROM outbox_job WHERE id = :id AND type IN (:types))")
                    .param("id", id).param("types", types).query(Boolean.class).single();
            throw exists
                    ? new ApiException(HttpStatus.CONFLICT, "JOB_NOT_FAILED", "Yalnız başarısız işler yeniden denenebilir")
                    : new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
        }
    }

    /** Retention: finished jobs are kept 90 days (architecture §6). */
    @Scheduled(fixedDelayString = "PT6H", initialDelayString = "PT10M")
    @Transactional
    public void purgeOld() {
        Instant cutoff = clock.instant().minus(java.time.Duration.ofDays(90));
        jdbc.sql("DELETE FROM outbox_job WHERE state IN ('DONE', 'SKIPPED', 'FAILED') AND updated_at < :cutoff")
                .param("cutoff", Timestamp.from(cutoff)).update();
    }
}
