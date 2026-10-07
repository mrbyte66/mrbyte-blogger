package com.satir.delivery.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Leases due jobs ({@code FOR UPDATE SKIP LOCKED}), runs handlers without holding DB locks and
 * records outcomes. Retries back off 1/5/15/60 minutes (+ jitter) up to 8 attempts, then FAILED,
 * which the owner can see and retry. A crashed lease becomes claimable again after it expires.
 */
@Component
@ConditionalOnProperty(name = "satir.jobs.enabled", havingValue = "true", matchIfMissing = true)
public class OutboxWorker {

    static final int MAX_ATTEMPTS = 8;
    private static final Duration LEASE = Duration.ofMinutes(2);
    private static final List<Duration> BACKOFF = List.of(Duration.ofMinutes(1), Duration.ofMinutes(5),
            Duration.ofMinutes(15), Duration.ofMinutes(60));
    private static final Logger log = LoggerFactory.getLogger(OutboxWorker.class);

    private final JdbcClient jdbc;
    private final TransactionTemplate transactions;
    private final Map<String, JobHandler> handlers;
    private final JsonMapper json;
    private final Clock clock;

    OutboxWorker(JdbcClient jdbc, TransactionTemplate transactions, List<JobHandler> handlers, JsonMapper json, Clock clock) {
        this.jdbc = jdbc;
        this.transactions = transactions;
        this.handlers = handlers.stream().collect(Collectors.toMap(JobHandler::type, Function.identity()));
        this.json = json;
        this.clock = clock;
    }

    @Scheduled(fixedDelayString = "${satir.jobs.poll-interval:PT5S}", initialDelayString = "${satir.jobs.initial-delay:PT10S}")
    public void poll() {
        runOnce(10);
    }

    /** Claims and processes up to {@code limit} jobs; returns how many were processed. */
    public int runOnce(int limit) {
        List<JobHandler.Job> jobs = claim(limit);
        for (JobHandler.Job job : jobs) {
            JobHandler handler = handlers.get(job.type());
            JobHandler.Outcome outcome;
            try {
                outcome = handler == null ? new JobHandler.Outcome.Retry("NO_HANDLER") : handler.handle(job);
            } catch (RuntimeException e) {
                log.warn("Job {} ({}) failed: {}", job.id(), job.type(), e.getClass().getSimpleName());
                outcome = new JobHandler.Outcome.Retry("HANDLER_ERROR");
            }
            record(job, outcome);
        }
        return jobs.size();
    }

    private List<JobHandler.Job> claim(int limit) {
        Instant now = clock.instant();
        return transactions.execute(status -> jdbc.sql("""
                UPDATE outbox_job SET state = 'RUNNING', attempts = attempts + 1, lease_until = :lease, updated_at = :now
                WHERE id IN (
                    SELECT id FROM outbox_job
                    WHERE (state = 'PENDING' AND available_at <= :now) OR (state = 'RUNNING' AND lease_until < :now)
                    ORDER BY available_at, id LIMIT :limit FOR UPDATE SKIP LOCKED)
                RETURNING id, type, aggregate_id, generation, dedupe_key, payload::text AS payload, attempts
                """)
                .param("now", Timestamp.from(now)).param("lease", Timestamp.from(now.plus(LEASE))).param("limit", limit)
                .query((rs, row) -> new JobHandler.Job(rs.getObject("id", UUID.class), rs.getString("type"),
                        rs.getObject("aggregate_id", UUID.class), rs.getLong("generation"), rs.getString("dedupe_key"),
                        json.readValue(rs.getString("payload"), new TypeReference<Map<String, Object>>() { }),
                        rs.getInt("attempts")))
                .list());
    }

    private void record(JobHandler.Job job, JobHandler.Outcome outcome) {
        Instant now = clock.instant();
        String state;
        String error = null;
        Instant availableAt = now;
        switch (outcome) {
            case JobHandler.Outcome.Done done -> state = "DONE";
            case JobHandler.Outcome.Skipped skipped -> {
                state = "SKIPPED";
                error = skipped.reason();
            }
            case JobHandler.Outcome.Retry retry -> {
                error = retry.errorCode();
                if (job.attempts() >= MAX_ATTEMPTS) {
                    state = "FAILED";
                } else {
                    state = "PENDING";
                    availableAt = now.plus(backoff(job.attempts()));
                }
            }
        }
        jdbc.sql("""
                UPDATE outbox_job SET state = :state, last_error_code = :error, available_at = :available,
                    lease_until = NULL, updated_at = :now WHERE id = :id
                """)
                .param("state", state).param("error", error).param("available", Timestamp.from(availableAt))
                .param("now", Timestamp.from(now)).param("id", job.id())
                .update();
    }

    static Duration backoff(int attempts) {
        Duration base = BACKOFF.get(Math.min(Math.max(attempts, 1), BACKOFF.size()) - 1);
        long jitterSeconds = ThreadLocalRandom.current().nextLong(0, Math.max(1, base.toSeconds() / 10) + 1);
        return base.plusSeconds(jitterSeconds);
    }
}
