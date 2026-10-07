package com.satir.reading.infrastructure;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Annotations, guest-note imports and visit history. Every statement is scoped by user ID. */
@Repository
public class ReadingRepository {

    public record AnnotationRow(UUID id, UUID articleId, UUID revisionId, String kind, String fragmentsJson, String note,
            Instant createdAt, long version) {
    }

    public record NewAnnotation(UUID userId, UUID id, UUID articleId, UUID revisionId, String kind, String fragmentsJson,
            String note, String importKey, Instant createdAt, Instant now) {
    }

    public record HistoryRow(UUID articleId, Instant lastVisitedAt) {
    }

    public record StoredImport(String requestHash, String reportJson) {
    }

    private static final String ANNOTATION_COLUMNS =
            "id, article_id, revision_id, kind, fragments::text AS fragments, note, created_at, version FROM annotation";

    private final JdbcClient jdbc;

    ReadingRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    // ---------------------------------------------------------------- annotations

    public List<AnnotationRow> annotations(UUID userId, UUID articleId) {
        return jdbc.sql("SELECT " + ANNOTATION_COLUMNS + " WHERE user_id = :user AND article_id = :article ORDER BY created_at, id")
                .param("user", userId).param("article", articleId).query(ReadingRepository::annotation).list();
    }

    public Optional<AnnotationRow> lockAnnotation(UUID userId, UUID id) {
        return jdbc.sql("SELECT " + ANNOTATION_COLUMNS + " WHERE user_id = :user AND id = :id FOR UPDATE")
                .param("user", userId).param("id", id).query(ReadingRepository::annotation).optional();
    }

    public int countAnnotations(UUID userId, UUID articleId) {
        return jdbc.sql("SELECT count(*) FROM annotation WHERE user_id = :user AND article_id = :article")
                .param("user", userId).param("article", articleId).query(Integer.class).single();
    }

    /** Returns false when the account already has an annotation with this ID (or import key). */
    public boolean insertAnnotation(NewAnnotation a) {
        return jdbc.sql("""
                INSERT INTO annotation (user_id, id, article_id, revision_id, kind, fragments, note, import_key, created_at, updated_at)
                VALUES (:user, :id, :article, :revision, :kind, CAST(:fragments AS jsonb), :note, :importKey, :createdAt, :now)
                ON CONFLICT DO NOTHING
                """)
                .param("user", a.userId()).param("id", a.id()).param("article", a.articleId()).param("revision", a.revisionId())
                .param("kind", a.kind()).param("fragments", a.fragmentsJson()).param("note", a.note())
                .param("importKey", a.importKey()).param("createdAt", Timestamp.from(a.createdAt()))
                .param("now", Timestamp.from(a.now()))
                .update() == 1;
    }

    public void updateAnnotation(UUID userId, UUID id, UUID revisionId, String kind, String fragmentsJson, String note, Instant now) {
        jdbc.sql("""
                UPDATE annotation SET revision_id = :revision, kind = :kind, fragments = CAST(:fragments AS jsonb), note = :note,
                    updated_at = :now, version = version + 1
                WHERE user_id = :user AND id = :id
                """)
                .param("user", userId).param("id", id).param("revision", revisionId).param("kind", kind)
                .param("fragments", fragmentsJson).param("note", note).param("now", Timestamp.from(now)).update();
    }

    public boolean deleteAnnotation(UUID userId, UUID articleId, UUID id) {
        return jdbc.sql("DELETE FROM annotation WHERE user_id = :user AND article_id = :article AND id = :id")
                .param("user", userId).param("article", articleId).param("id", id).update() == 1;
    }

    public Optional<StoredImport> lockImport(UUID userId, UUID clientImportId) {
        return jdbc.sql("""
                SELECT request_hash, report::text AS report FROM annotation_import
                WHERE user_id = :user AND client_import_id = :id FOR UPDATE
                """)
                .param("user", userId).param("id", clientImportId)
                .query((rs, n) -> new StoredImport(rs.getString("request_hash"), rs.getString("report")))
                .optional();
    }

    public void insertImport(UUID userId, UUID clientImportId, String requestHash, String reportJson, Instant now) {
        jdbc.sql("""
                INSERT INTO annotation_import (user_id, client_import_id, request_hash, report, created_at)
                VALUES (:user, :id, :hash, CAST(:report AS jsonb), :now)
                """)
                .param("user", userId).param("id", clientImportId).param("hash", requestHash).param("report", reportJson)
                .param("now", Timestamp.from(now)).update();
    }

    // ---------------------------------------------------------------- history

    /** Keeps the latest visit: an older or replayed event never moves the time backwards. */
    public void recordVisit(UUID userId, UUID articleId, UUID revisionId, Instant visitedAt) {
        jdbc.sql("""
                INSERT INTO reading_history (user_id, article_id, last_visited_at, last_revision_id)
                VALUES (:user, :article, :at, :revision)
                ON CONFLICT (user_id, article_id) DO UPDATE SET
                    last_revision_id = CASE WHEN EXCLUDED.last_visited_at >= reading_history.last_visited_at
                                            THEN EXCLUDED.last_revision_id ELSE reading_history.last_revision_id END,
                    last_visited_at = GREATEST(reading_history.last_visited_at, EXCLUDED.last_visited_at)
                """)
                .param("user", userId).param("article", articleId).param("revision", revisionId)
                .param("at", Timestamp.from(visitedAt)).update();
    }

    public List<HistoryRow> history(UUID userId, int page, int size) {
        return jdbc.sql("""
                SELECT article_id, last_visited_at FROM reading_history WHERE user_id = :user
                ORDER BY last_visited_at DESC, article_id DESC LIMIT :limit OFFSET :offset
                """)
                .param("user", userId).param("limit", size).param("offset", (long) page * size)
                .query((rs, n) -> new HistoryRow(rs.getObject("article_id", UUID.class), rs.getTimestamp("last_visited_at").toInstant()))
                .list();
    }

    public long countHistory(UUID userId) {
        return jdbc.sql("SELECT count(*) FROM reading_history WHERE user_id = :user").param("user", userId)
                .query(Long.class).single();
    }

    public Map<UUID, Instant> lastVisits(UUID userId, Collection<UUID> articleIds) {
        if (articleIds.isEmpty()) {
            return Map.of();
        }
        return jdbc.sql("SELECT article_id, last_visited_at FROM reading_history WHERE user_id = :user AND article_id IN (:ids)")
                .param("user", userId).param("ids", articleIds)
                .query((rs, n) -> Map.entry(rs.getObject("article_id", UUID.class), rs.getTimestamp("last_visited_at").toInstant()))
                .list().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public void clearHistory(UUID userId) {
        jdbc.sql("DELETE FROM reading_history WHERE user_id = :user").param("user", userId).update();
    }

    public int purgeHistoryBefore(Instant cutoff) {
        return jdbc.sql("DELETE FROM reading_history WHERE last_visited_at < :cutoff")
                .param("cutoff", Timestamp.from(cutoff)).update();
    }

    public void deleteAll(UUID userId) {
        jdbc.sql("DELETE FROM annotation WHERE user_id = :user").param("user", userId).update();
        jdbc.sql("DELETE FROM annotation_import WHERE user_id = :user").param("user", userId).update();
        jdbc.sql("DELETE FROM reading_history WHERE user_id = :user").param("user", userId).update();
    }

    private static AnnotationRow annotation(ResultSet rs, int row) throws SQLException {
        return new AnnotationRow(rs.getObject("id", UUID.class), rs.getObject("article_id", UUID.class),
                rs.getObject("revision_id", UUID.class), rs.getString("kind"), rs.getString("fragments"), rs.getString("note"),
                rs.getTimestamp("created_at").toInstant(), rs.getLong("version"));
    }
}
