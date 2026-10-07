package com.satir.engagement.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Anonymous actors, claps, impression receipts and view totals. */
@Repository
public class EngagementRepository {

    public record Receipt(UUID articleId, String actorKeyHash, String source, UUID pageViewId, boolean counted) {
    }

    private final JdbcClient jdbc;

    EngagementRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- anonymous actors

    public void insertActor(UUID id, String secretHash, Instant now, Instant expiresAt) {
        jdbc.sql("INSERT INTO anonymous_actor (id, secret_hash, created_at, expires_at) VALUES (:id, :hash, :now, :expires)")
                .param("id", id).param("hash", secretHash).param("now", Timestamp.from(now))
                .param("expires", Timestamp.from(expiresAt)).update();
    }

    public Optional<UUID> actorBySecret(String secretHash, Instant now) {
        return jdbc.sql("SELECT id FROM anonymous_actor WHERE secret_hash = :hash AND expires_at > :now")
                .param("hash", secretHash).param("now", Timestamp.from(now)).query(UUID.class).optional();
    }

    /** Expired anonymous identities and (by cascade) their claps; totals drop accordingly. */
    public int purgeExpiredActors(Instant now) {
        return jdbc.sql("DELETE FROM anonymous_actor WHERE expires_at <= :now").param("now", Timestamp.from(now)).update();
    }

    // ---------------------------------------------------------------- claps

    public boolean memberClapped(UUID articleId, UUID userId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM article_clap WHERE article_id = :article AND user_id = :user)")
                .param("article", articleId).param("user", userId).query(Boolean.class).single();
    }

    public boolean anonymousClapped(UUID articleId, UUID actorId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM article_clap WHERE article_id = :article AND anonymous_actor_id = :actor)")
                .param("article", articleId).param("actor", actorId).query(Boolean.class).single();
    }

    public void addMemberClap(UUID id, UUID articleId, UUID userId, Instant now) {
        jdbc.sql("""
                INSERT INTO article_clap (id, article_id, user_id, created_at) VALUES (:id, :article, :user, :now)
                ON CONFLICT DO NOTHING
                """)
                .param("id", id).param("article", articleId).param("user", userId).param("now", Timestamp.from(now)).update();
    }

    public void addAnonymousClap(UUID id, UUID articleId, UUID actorId, Instant now) {
        jdbc.sql("""
                INSERT INTO article_clap (id, article_id, anonymous_actor_id, created_at) VALUES (:id, :article, :actor, :now)
                ON CONFLICT DO NOTHING
                """)
                .param("id", id).param("article", articleId).param("actor", actorId).param("now", Timestamp.from(now)).update();
    }

    public void removeMemberClap(UUID articleId, UUID userId) {
        jdbc.sql("DELETE FROM article_clap WHERE article_id = :article AND user_id = :user")
                .param("article", articleId).param("user", userId).update();
    }

    public void removeAnonymousClap(UUID articleId, UUID actorId) {
        jdbc.sql("DELETE FROM article_clap WHERE article_id = :article AND anonymous_actor_id = :actor")
                .param("article", articleId).param("actor", actorId).update();
    }

    public void deleteMemberClaps(UUID userId) {
        jdbc.sql("DELETE FROM article_clap WHERE user_id = :user").param("user", userId).update();
    }

    public Map<UUID, Long> clapCounts(Collection<UUID> articleIds) {
        return counts("SELECT article_id, count(*) AS n FROM article_clap WHERE article_id IN (:ids) GROUP BY article_id", articleIds);
    }

    // ---------------------------------------------------------------- views

    public Optional<Receipt> receipt(UUID eventId) {
        return jdbc.sql("SELECT article_id, actor_key_hash, source, page_view_id, counted FROM impression_receipt WHERE event_id = :id")
                .param("id", eventId)
                .query((rs, n) -> new Receipt(rs.getObject("article_id", UUID.class), rs.getString("actor_key_hash"),
                        rs.getString("source"), rs.getObject("page_view_id", UUID.class), rs.getBoolean("counted")))
                .optional();
    }

    /**
     * Inserts a receipt. With {@code counted = true} the (actor, article, source, page view) slot is
     * reserved as well; returns false when the event ID or that slot already exists.
     */
    public boolean insertReceipt(UUID eventId, Receipt receipt, Instant occurredAt, Instant now) {
        return jdbc.sql("""
                INSERT INTO impression_receipt (event_id, article_id, actor_key_hash, source, page_view_id, occurred_at, received_at, counted)
                VALUES (:event, :article, :actor, :source, :pageView, :occurred, :now, :counted)
                ON CONFLICT DO NOTHING
                """)
                .param("event", eventId).param("article", receipt.articleId()).param("actor", receipt.actorKeyHash())
                .param("source", receipt.source()).param("pageView", receipt.pageViewId())
                .param("occurred", Timestamp.from(occurredAt)).param("now", Timestamp.from(now))
                .param("counted", receipt.counted()).update() == 1;
    }

    public void incrementViews(UUID articleId) {
        jdbc.sql("""
                INSERT INTO article_totals (article_id, views) VALUES (:article, 1)
                ON CONFLICT (article_id) DO UPDATE SET views = article_totals.views + 1
                """)
                .param("article", articleId).update();
    }

    public Map<UUID, Long> viewCounts(Collection<UUID> articleIds) {
        return counts("SELECT article_id, views AS n FROM article_totals WHERE article_id IN (:ids)", articleIds);
    }

    public int purgeReceiptsBefore(Instant cutoff) {
        return jdbc.sql("DELETE FROM impression_receipt WHERE received_at < :cutoff")
                .param("cutoff", Timestamp.from(cutoff)).update();
    }

    private Map<UUID, Long> counts(String sql, Collection<UUID> articleIds) {
        if (articleIds.isEmpty()) {
            return Map.of();
        }
        return jdbc.sql(sql).param("ids", articleIds)
                .query((rs, n) -> Map.entry(rs.getObject("article_id", UUID.class), rs.getLong("n")))
                .list().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }
}
