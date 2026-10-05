package com.satir.platform.audit;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.satir.platform.db.IdGenerator;
import com.satir.platform.web.RequestIdFilter;

/**
 * Append-only security/publication audit trail. Callers pass identifiers and outcomes only:
 * never content, notes, passwords, tokens or e-mail addresses.
 */
@Component
public class AuditLog {

    public enum Outcome { SUCCESS, FAILURE, DENIED }

    private final JdbcClient jdbc;
    private final Clock clock;
    private final IdGenerator ids;

    AuditLog(JdbcClient jdbc, Clock clock, IdGenerator ids) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.ids = ids;
    }

    public void record(UUID actorId, String action, String resourceKind, UUID resourceId, Outcome outcome) {
        jdbc.sql("""
                INSERT INTO audit_event (id, actor_id, action, resource_kind, resource_id, outcome, request_id, created_at)
                VALUES (:id, :actor, :action, :kind, :resource, :outcome, :requestId, :createdAt)
                """)
                .param("id", ids.next())
                .param("actor", actorId)
                .param("action", action)
                .param("kind", resourceKind)
                .param("resource", resourceId)
                .param("outcome", outcome.name())
                .param("requestId", RequestIdFilter.current())
                .param("createdAt", Timestamp.from(clock.instant()))
                .update();
    }
}
