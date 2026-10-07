package com.satir.library.infrastructure;

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

/** Collections and bookmarks. Every statement is scoped by the owning account's ID. */
@Repository
public class LibraryRepository {

    public record CollectionRow(UUID id, String name, boolean isDefault, long count, long version, Instant createdAt) {
    }

    public record BookmarkRow(UUID articleId, UUID collectionId, Instant savedAt, long version) {
    }

    private final JdbcClient jdbc;

    LibraryRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Creates the immutable default collection once; concurrent calls are harmless. */
    public void ensureDefault(UUID userId, UUID id, String name, String normalized, Instant now) {
        jdbc.sql("""
                INSERT INTO collection (id, user_id, name, normalized_name, is_default, created_at, updated_at)
                VALUES (:id, :user, :name, :normalized, TRUE, :now, :now)
                ON CONFLICT DO NOTHING
                """)
                .param("id", id).param("user", userId).param("name", name).param("normalized", normalized)
                .param("now", Timestamp.from(now)).update();
    }

    public UUID defaultCollection(UUID userId) {
        return jdbc.sql("SELECT id FROM collection WHERE user_id = :user AND is_default")
                .param("user", userId).query(UUID.class).single();
    }

    public List<CollectionRow> collections(UUID userId) {
        return jdbc.sql("""
                SELECT c.id, c.name, c.is_default, c.version, c.created_at,
                       (SELECT count(*) FROM bookmark b WHERE b.user_id = c.user_id AND b.collection_id = c.id) AS count
                FROM collection c WHERE c.user_id = :user
                ORDER BY c.is_default DESC, c.created_at, c.id
                """)
                .param("user", userId)
                .query((rs, n) -> new CollectionRow(rs.getObject("id", UUID.class), rs.getString("name"),
                        rs.getBoolean("is_default"), rs.getLong("count"), rs.getLong("version"),
                        rs.getTimestamp("created_at").toInstant()))
                .list();
    }

    public Optional<CollectionRow> lockCollection(UUID userId, UUID id) {
        return jdbc.sql("""
                SELECT id, name, is_default, version, created_at, 0 AS count FROM collection
                WHERE user_id = :user AND id = :id FOR UPDATE
                """)
                .param("user", userId).param("id", id)
                .query((rs, n) -> new CollectionRow(rs.getObject("id", UUID.class), rs.getString("name"),
                        rs.getBoolean("is_default"), 0, rs.getLong("version"), rs.getTimestamp("created_at").toInstant()))
                .optional();
    }

    public boolean ownsCollection(UUID userId, UUID id) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM collection WHERE user_id = :user AND id = :id)")
                .param("user", userId).param("id", id).query(Boolean.class).single();
    }

    public int countCollections(UUID userId) {
        return jdbc.sql("SELECT count(*) FROM collection WHERE user_id = :user").param("user", userId)
                .query(Integer.class).single();
    }

    public boolean nameTaken(UUID userId, String normalized, UUID exceptId) {
        return jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM collection WHERE user_id = :user AND normalized_name = :name
                    AND (CAST(:except AS uuid) IS NULL OR id <> CAST(:except AS uuid)))
                """)
                .param("user", userId).param("name", normalized).param("except", exceptId)
                .query(Boolean.class).single();
    }

    public void insertCollection(UUID userId, UUID id, String name, String normalized, Instant now) {
        jdbc.sql("""
                INSERT INTO collection (id, user_id, name, normalized_name, is_default, created_at, updated_at)
                VALUES (:id, :user, :name, :normalized, FALSE, :now, :now)
                """)
                .param("id", id).param("user", userId).param("name", name).param("normalized", normalized)
                .param("now", Timestamp.from(now)).update();
    }

    public void renameCollection(UUID userId, UUID id, String name, String normalized, Instant now) {
        jdbc.sql("""
                UPDATE collection SET name = :name, normalized_name = :normalized, updated_at = :now, version = version + 1
                WHERE user_id = :user AND id = :id
                """)
                .param("user", userId).param("id", id).param("name", name).param("normalized", normalized)
                .param("now", Timestamp.from(now)).update();
    }

    /** Moves bookmarks to the default collection without touching their saved time, then deletes. */
    public void deleteCollection(UUID userId, UUID id, UUID defaultId) {
        jdbc.sql("""
                UPDATE bookmark SET collection_id = :default, version = version + 1
                WHERE user_id = :user AND collection_id = :id
                """)
                .param("user", userId).param("id", id).param("default", defaultId).update();
        jdbc.sql("DELETE FROM collection WHERE user_id = :user AND id = :id AND NOT is_default")
                .param("user", userId).param("id", id).update();
    }

    public List<BookmarkRow> bookmarks(UUID userId) {
        return jdbc.sql("""
                SELECT article_id, collection_id, saved_at, version FROM bookmark WHERE user_id = :user
                ORDER BY saved_at, article_id
                """)
                .param("user", userId)
                .query((rs, n) -> new BookmarkRow(rs.getObject("article_id", UUID.class), rs.getObject("collection_id", UUID.class),
                        rs.getTimestamp("saved_at").toInstant(), rs.getLong("version")))
                .list();
    }

    public List<BookmarkRow> bookmarks(UUID userId, Collection<UUID> articleIds) {
        if (articleIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                SELECT article_id, collection_id, saved_at, version FROM bookmark
                WHERE user_id = :user AND article_id IN (:ids)
                """)
                .param("user", userId).param("ids", articleIds)
                .query((rs, n) -> new BookmarkRow(rs.getObject("article_id", UUID.class), rs.getObject("collection_id", UUID.class),
                        rs.getTimestamp("saved_at").toInstant(), rs.getLong("version")))
                .list();
    }

    public Optional<BookmarkRow> lockBookmark(UUID userId, UUID articleId) {
        return jdbc.sql("""
                SELECT article_id, collection_id, saved_at, version FROM bookmark
                WHERE user_id = :user AND article_id = :article FOR UPDATE
                """)
                .param("user", userId).param("article", articleId)
                .query((rs, n) -> new BookmarkRow(rs.getObject("article_id", UUID.class), rs.getObject("collection_id", UUID.class),
                        rs.getTimestamp("saved_at").toInstant(), rs.getLong("version")))
                .optional();
    }

    public int countBookmarks(UUID userId) {
        return jdbc.sql("SELECT count(*) FROM bookmark WHERE user_id = :user").param("user", userId)
                .query(Integer.class).single();
    }

    /** Returns false when a concurrent request saved the same article first. */
    public boolean insertBookmark(UUID userId, UUID articleId, UUID collectionId, Instant now) {
        return jdbc.sql("""
                INSERT INTO bookmark (user_id, article_id, collection_id, saved_at) VALUES (:user, :article, :collection, :now)
                ON CONFLICT (user_id, article_id) DO NOTHING
                """)
                .param("user", userId).param("article", articleId).param("collection", collectionId)
                .param("now", Timestamp.from(now)).update() == 1;
    }

    public void moveBookmark(UUID userId, UUID articleId, UUID collectionId) {
        jdbc.sql("""
                UPDATE bookmark SET collection_id = :collection, version = version + 1
                WHERE user_id = :user AND article_id = :article
                """)
                .param("user", userId).param("article", articleId).param("collection", collectionId).update();
    }

    public void deleteBookmark(UUID userId, UUID articleId) {
        jdbc.sql("DELETE FROM bookmark WHERE user_id = :user AND article_id = :article")
                .param("user", userId).param("article", articleId).update();
    }

    /** Public save totals: number of accounts that saved each article. */
    public Map<UUID, Long> saveCounts(Collection<UUID> articleIds) {
        if (articleIds.isEmpty()) {
            return Map.of();
        }
        return jdbc.sql("SELECT article_id, count(*) AS saves FROM bookmark WHERE article_id IN (:ids) GROUP BY article_id")
                .param("ids", articleIds)
                .query((rs, n) -> Map.entry(rs.getObject("article_id", UUID.class), rs.getLong("saves")))
                .list().stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
    }

    public void deleteAll(UUID userId) {
        jdbc.sql("DELETE FROM bookmark WHERE user_id = :user").param("user", userId).update();
        jdbc.sql("DELETE FROM collection WHERE user_id = :user").param("user", userId).update();
    }
}
