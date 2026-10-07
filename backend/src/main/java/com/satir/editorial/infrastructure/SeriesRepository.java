package com.satir.editorial.infrastructure;

import static com.satir.editorial.infrastructure.ArticleRepository.instant;
import static com.satir.editorial.infrastructure.ArticleRepository.likeEscape;
import static com.satir.editorial.infrastructure.ArticleRepository.ts;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.satir.editorial.infrastructure.EditorialRows.ChapterRow;
import com.satir.editorial.infrastructure.EditorialRows.PageResult;
import com.satir.editorial.infrastructure.EditorialRows.SeriesRow;

/** Series rows and ordered chapter membership. */
@Repository
public class SeriesRepository {

    private static final String SELECT = """
            SELECT s.*, sl.slug FROM series s
            JOIN slug_registry sl ON sl.series_id = s.id AND sl.is_current
            """;

    /** A series is public when published and at least one chapter is a public article. */
    public static final String PUBLIC_PREDICATE = """
            s.status = 'PUBLISHED' AND EXISTS (
                SELECT 1 FROM series_chapter pc JOIN article pa ON pa.id = pc.article_id
                WHERE pc.series_id = s.id AND pa.status = 'PUBLISHED' AND pa.visibility = 'PUBLIC')
            """;

    public record Fields(String title, String summary, boolean ongoing, String coverMode, UUID coverAssetId,
            String presentationJson, String seoJson) {
    }

    private final JdbcClient jdbc;

    SeriesRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(UUID id, UUID ownerId, Fields fields, Instant now) {
        jdbc.sql("""
                INSERT INTO series (id, owner_id, title, summary, status, ongoing, cover_mode, cover_asset_id, presentation, seo,
                    created_at, updated_at)
                VALUES (:id, :owner, :title, :summary, 'DRAFT', :ongoing, :coverMode, :coverAsset, CAST(:presentation AS jsonb),
                    CAST(:seo AS jsonb), :now, :now)
                """)
                .param("id", id).param("owner", ownerId).param("title", fields.title()).param("summary", fields.summary())
                .param("ongoing", fields.ongoing()).param("coverMode", fields.coverMode())
                .param("coverAsset", fields.coverAssetId()).param("presentation", fields.presentationJson())
                .param("seo", fields.seoJson()).param("now", Timestamp.from(now))
                .update();
    }

    public void update(UUID id, Fields fields, Instant now) {
        jdbc.sql("""
                UPDATE series SET title = :title, summary = :summary, ongoing = :ongoing, cover_mode = :coverMode,
                    cover_asset_id = :coverAsset, presentation = CAST(:presentation AS jsonb), seo = CAST(:seo AS jsonb),
                    updated_at = :now, version = version + 1
                WHERE id = :id
                """)
                .param("id", id).param("title", fields.title()).param("summary", fields.summary())
                .param("ongoing", fields.ongoing()).param("coverMode", fields.coverMode())
                .param("coverAsset", fields.coverAssetId()).param("presentation", fields.presentationJson())
                .param("seo", fields.seoJson()).param("now", Timestamp.from(now))
                .update();
    }

    public void updateStatus(UUID id, String status, Instant publicModifiedAt, Instant now) {
        jdbc.sql("""
                UPDATE series SET status = :status, public_modified_at = COALESCE(:publicModified, public_modified_at),
                    updated_at = :now, version = version + 1 WHERE id = :id
                """)
                .param("id", id).param("status", status).param("publicModified", ts(publicModifiedAt))
                .param("now", Timestamp.from(now)).update();
    }

    /** Membership/public-content change: bump version and the public modification time. */
    public void touch(UUID id, Instant now) {
        jdbc.sql("UPDATE series SET version = version + 1, updated_at = :now, public_modified_at = :now WHERE id = :id")
                .param("id", id).param("now", Timestamp.from(now)).update();
    }

    public Optional<SeriesRow> lock(UUID id) {
        boolean exists = jdbc.sql("SELECT id FROM series WHERE id = :id FOR UPDATE").param("id", id)
                .query(UUID.class).optional().isPresent();
        return exists ? find(id) : Optional.empty();
    }

    public Optional<SeriesRow> find(UUID id) {
        return jdbc.sql(SELECT + " WHERE s.id = :id").param("id", id).query(SeriesRepository::map).optional();
    }

    public List<SeriesRow> findAll(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbc.sql(SELECT + " WHERE s.id IN (:ids)").param("ids", ids).query(SeriesRepository::map).list();
    }

    public PageResult<SeriesRow> page(String status, String query, boolean publicOnly, int page, int size) {
        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder(" WHERE TRUE");
        if (publicOnly) {
            where.append(" AND ").append(PUBLIC_PREDICATE);
        }
        if (status != null) {
            where.append(" AND s.status = :status");
            params.put("status", status);
        }
        if (query != null) {
            where.append(" AND (s.title ILIKE :q ESCAPE '\\' OR s.summary ILIKE :q ESCAPE '\\')");
            params.put("q", "%" + likeEscape(query) + "%");
        }
        long total = jdbc.sql("SELECT count(*) FROM series s" + where).params(params).query(Long.class).single();
        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<SeriesRow> rows = jdbc.sql(SELECT + where + " ORDER BY s.title COLLATE \"tr-TR-x-icu\", s.id LIMIT :limit OFFSET :offset")
                .params(params).query(SeriesRepository::map).list();
        return new PageResult<>(rows, total);
    }

    public boolean isPublic(UUID id) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM series s WHERE s.id = :id AND " + PUBLIC_PREDICATE + ")")
                .param("id", id).query(Boolean.class).single();
    }

    public List<SeriesRow> indexable() {
        return jdbc.sql(SELECT + " WHERE " + PUBLIC_PREDICATE
                + " AND COALESCE((s.seo ->> 'indexable')::boolean, true) ORDER BY s.title COLLATE \"tr-TR-x-icu\", s.id")
                .query(SeriesRepository::map).list();
    }

    /** All chapters of the given series in order, with article state and current slug/title. */
    public List<ChapterRow> chapters(List<UUID> seriesIds) {
        if (seriesIds.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("""
                SELECT c.series_id, c.article_id, c.position, sl.slug, r.title, a.status, a.visibility, a.version, a.created_at
                FROM series_chapter c
                JOIN article a ON a.id = c.article_id
                JOIN article_revision r ON r.id = a.current_revision_id
                JOIN slug_registry sl ON sl.article_id = a.id AND sl.is_current
                WHERE c.series_id IN (:ids)
                ORDER BY c.series_id, c.position
                """)
                .param("ids", seriesIds)
                .query((rs, row) -> new ChapterRow(rs.getObject("series_id", UUID.class), rs.getObject("article_id", UUID.class),
                        rs.getInt("position"), rs.getString("slug"), rs.getString("title"), rs.getString("status"),
                        rs.getString("visibility"), rs.getLong("version"), instant(rs, "created_at")))
                .list();
    }

    public Optional<UUID> seriesOf(UUID articleId) {
        return jdbc.sql("SELECT series_id FROM series_chapter WHERE article_id = :id").param("id", articleId)
                .query(UUID.class).optional();
    }

    /** Replaces the full ordered membership of a series (position uniqueness is checked at commit). */
    public void replaceChapters(UUID seriesId, List<UUID> articleIds) {
        jdbc.sql("DELETE FROM series_chapter WHERE series_id = :id").param("id", seriesId).update();
        for (int i = 0; i < articleIds.size(); i++) {
            jdbc.sql("INSERT INTO series_chapter (article_id, series_id, position) VALUES (:article, :series, :position)")
                    .param("article", articleIds.get(i)).param("series", seriesId).param("position", i)
                    .update();
        }
    }

    public void removeChapter(UUID articleId) {
        jdbc.sql("DELETE FROM series_chapter WHERE article_id = :id").param("id", articleId).update();
    }

    public boolean assetPubliclyReferenced(UUID assetId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM series s WHERE s.cover_asset_id = :asset AND " + PUBLIC_PREDICATE + ")")
                .param("asset", assetId).query(Boolean.class).single();
    }

    public boolean assetReferenced(UUID assetId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM series WHERE cover_asset_id = :asset)")
                .param("asset", assetId).query(Boolean.class).single();
    }

    private static SeriesRow map(ResultSet rs, int row) throws SQLException {
        return new SeriesRow(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("title"),
                rs.getString("summary"), rs.getString("status"), rs.getBoolean("ongoing"), rs.getString("cover_mode"),
                rs.getObject("cover_asset_id", UUID.class), rs.getString("presentation"), rs.getString("seo"),
                instant(rs, "public_modified_at"), instant(rs, "created_at"), instant(rs, "updated_at"),
                rs.getLong("version"), rs.getString("slug"));
    }
}
