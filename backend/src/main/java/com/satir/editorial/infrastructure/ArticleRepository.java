package com.satir.editorial.infrastructure;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.editorial.infrastructure.EditorialRows.CategoryRow;
import com.satir.editorial.infrastructure.EditorialRows.PageResult;

/** Article aggregate persistence: state row, immutable revisions, categories and media references. */
@Repository
public class ArticleRepository {

    public static final String PUBLIC_PREDICATE = "a.status = 'PUBLISHED' AND a.visibility = 'PUBLIC'";

    private static final String SELECT = """
            SELECT a.id, a.owner_id, a.status, a.visibility, a.display_date, a.first_published_at, a.last_published_at,
                   a.public_modified_at, a.scheduled_at, a.schedule_zone, a.schedule_generation, a.publication_generation,
                   a.created_at, a.updated_at, a.version,
                   r.id AS revision_id, r.revision_number, r.title, r.eyebrow, r.abstract, r.document::text AS document,
                   r.presentation::text AS presentation, r.seo::text AS seo, r.cover_mode, r.cover_asset_id,
                   s.slug, c.series_id, c.position AS series_position
            FROM article a
            JOIN article_revision r ON r.id = a.current_revision_id
            JOIN slug_registry s ON s.article_id = a.id AND s.is_current
            LEFT JOIN series_chapter c ON c.article_id = a.id
            """;

    public record NewRevision(UUID id, UUID articleId, int number, String title, String eyebrow, String abstractText,
            String documentJson, String presentationJson, String seoJson, String coverMode, UUID coverAssetId,
            UUID authoredBy, Instant createdAt) {
    }

    public record StateUpdate(String status, String visibility, LocalDate displayDate, Instant firstPublishedAt,
            Instant lastPublishedAt, Instant publicModifiedAt, Instant scheduledAt, String scheduleZone,
            long scheduleGeneration, long publicationGeneration, UUID currentRevisionId, Instant updatedAt) {
    }

    public record Filter(String status, String visibility, UUID seriesId, UUID categoryId, String query, boolean publicOnly) {
    }

    private final JdbcClient jdbc;

    ArticleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insertArticle(UUID id, UUID ownerId, UUID revisionId, String visibility, LocalDate displayDate, Instant now) {
        jdbc.sql("""
                INSERT INTO article (id, owner_id, current_revision_id, status, visibility, display_date, created_at, updated_at)
                VALUES (:id, :owner, :revision, 'DRAFT', :visibility, :date, :now, :now)
                """)
                .param("id", id).param("owner", ownerId).param("revision", revisionId).param("visibility", visibility)
                .param("date", Date.valueOf(displayDate)).param("now", Timestamp.from(now))
                .update();
    }

    public void insertRevision(NewRevision revision) {
        jdbc.sql("""
                INSERT INTO article_revision (id, article_id, revision_number, title, eyebrow, abstract, document, presentation,
                    seo, cover_mode, cover_asset_id, authored_by, created_at)
                VALUES (:id, :article, :number, :title, :eyebrow, :abstract, CAST(:document AS jsonb), CAST(:presentation AS jsonb),
                    CAST(:seo AS jsonb), :coverMode, :coverAsset, :author, :createdAt)
                """)
                .param("id", revision.id()).param("article", revision.articleId()).param("number", revision.number())
                .param("title", revision.title()).param("eyebrow", revision.eyebrow()).param("abstract", revision.abstractText())
                .param("document", revision.documentJson()).param("presentation", revision.presentationJson())
                .param("seo", revision.seoJson()).param("coverMode", revision.coverMode())
                .param("coverAsset", revision.coverAssetId()).param("author", revision.authoredBy())
                .param("createdAt", Timestamp.from(revision.createdAt()))
                .update();
    }

    /** Applies a state change and bumps the version; returns false if the version moved meanwhile. */
    public void updateState(UUID id, StateUpdate update) {
        jdbc.sql("""
                UPDATE article SET status = :status, visibility = :visibility, display_date = :date,
                    first_published_at = :firstPublished, last_published_at = :lastPublished,
                    public_modified_at = :publicModified, scheduled_at = :scheduledAt, schedule_zone = :zone,
                    schedule_generation = :scheduleGeneration, publication_generation = :publicationGeneration,
                    current_revision_id = :revision, updated_at = :updatedAt, version = version + 1
                WHERE id = :id
                """)
                .param("id", id).param("status", update.status()).param("visibility", update.visibility())
                .param("date", Date.valueOf(update.displayDate()))
                .param("firstPublished", ts(update.firstPublishedAt())).param("lastPublished", ts(update.lastPublishedAt()))
                .param("publicModified", ts(update.publicModifiedAt())).param("scheduledAt", ts(update.scheduledAt()))
                .param("zone", update.scheduleZone()).param("scheduleGeneration", update.scheduleGeneration())
                .param("publicationGeneration", update.publicationGeneration())
                .param("revision", update.currentRevisionId()).param("updatedAt", Timestamp.from(update.updatedAt()))
                .update();
    }

    public void bumpVersion(UUID id, Instant now) {
        jdbc.sql("UPDATE article SET version = version + 1, updated_at = :now WHERE id = :id")
                .param("id", id).param("now", Timestamp.from(now)).update();
    }

    public int nextRevisionNumber(UUID articleId) {
        return jdbc.sql("SELECT COALESCE(MAX(revision_number), 0) + 1 FROM article_revision WHERE article_id = :id")
                .param("id", articleId).query(Integer.class).single();
    }

    public void replaceCategories(UUID articleId, List<UUID> categoryIds) {
        jdbc.sql("DELETE FROM article_category WHERE article_id = :id").param("id", articleId).update();
        for (int i = 0; i < categoryIds.size(); i++) {
            jdbc.sql("INSERT INTO article_category (article_id, category_id, position) VALUES (:article, :category, :position)")
                    .param("article", articleId).param("category", categoryIds.get(i)).param("position", i)
                    .update();
        }
    }

    public void insertMediaRefs(UUID revisionId, UUID articleId, UUID coverAssetId, List<UUID> bodyAssetIds) {
        if (coverAssetId != null) {
            insertMediaRef(revisionId, articleId, coverAssetId, "COVER");
        }
        bodyAssetIds.stream().distinct().forEach(asset -> insertMediaRef(revisionId, articleId, asset, "BODY"));
    }

    private void insertMediaRef(UUID revisionId, UUID articleId, UUID assetId, String usage) {
        jdbc.sql("""
                INSERT INTO article_media_ref (revision_id, article_id, asset_id, usage) VALUES (:revision, :article, :asset, :usage)
                ON CONFLICT DO NOTHING
                """)
                .param("revision", revisionId).param("article", articleId).param("asset", assetId).param("usage", usage)
                .update();
    }

    /** Row-locks the article for a command (scheduler and owner commands serialize on this lock). */
    public Optional<ArticleRow> lock(UUID id) {
        boolean exists = jdbc.sql("SELECT id FROM article WHERE id = :id FOR UPDATE").param("id", id)
                .query(UUID.class).optional().isPresent();
        return exists ? find(id) : Optional.empty();
    }

    public Optional<ArticleRow> find(UUID id) {
        return withCategories(jdbc.sql(SELECT + " WHERE a.id = :id").param("id", id).query(ArticleRepository::map).list())
                .stream().findFirst();
    }

    public List<ArticleRow> findAll(List<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        Map<UUID, ArticleRow> byId = new HashMap<>();
        withCategories(jdbc.sql(SELECT + " WHERE a.id IN (:ids)").param("ids", ids).query(ArticleRepository::map).list())
                .forEach(row -> byId.put(row.id(), row));
        return ids.stream().map(byId::get).filter(java.util.Objects::nonNull).toList();
    }

    public PageResult<ArticleRow> page(Filter filter, String orderBy, int page, int size) {
        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder(" WHERE TRUE");
        if (filter.publicOnly()) {
            where.append(" AND ").append(PUBLIC_PREDICATE);
        }
        if (filter.status() != null) {
            where.append(" AND a.status = :status");
            params.put("status", filter.status());
        }
        if (filter.visibility() != null) {
            where.append(" AND a.visibility = :visibility");
            params.put("visibility", filter.visibility());
        }
        if (filter.seriesId() != null) {
            where.append(" AND c.series_id = :series");
            params.put("series", filter.seriesId());
        }
        if (filter.categoryId() != null) {
            where.append(" AND EXISTS (SELECT 1 FROM article_category ac WHERE ac.article_id = a.id AND ac.category_id = :category)");
            params.put("category", filter.categoryId());
        }
        if (filter.query() != null) {
            where.append("""
                     AND (r.title ILIKE :q ESCAPE '\\' OR r.abstract ILIKE :q ESCAPE '\\' OR EXISTS (
                         SELECT 1 FROM article_category ac JOIN category cat ON cat.id = ac.category_id
                         WHERE ac.article_id = a.id AND cat.name ILIKE :q ESCAPE '\\'))
                    """);
            params.put("q", "%" + likeEscape(filter.query()) + "%");
        }
        long total = jdbc.sql("""
                SELECT count(*) FROM article a
                JOIN article_revision r ON r.id = a.current_revision_id
                LEFT JOIN series_chapter c ON c.article_id = a.id
                """ + where).params(params).query(Long.class).single();
        params.put("limit", size);
        params.put("offset", (long) page * size);
        List<ArticleRow> rows = jdbc.sql(SELECT + where + " ORDER BY " + orderBy + " LIMIT :limit OFFSET :offset")
                .params(params).query(ArticleRepository::map).list();
        return new PageResult<>(withCategories(rows), total);
    }

    /** IDs of scheduled public articles whose time has come, oldest first. */
    public List<UUID> dueScheduled(Instant now, int limit) {
        return jdbc.sql("""
                SELECT id FROM article WHERE status = 'SCHEDULED' AND scheduled_at <= :now
                ORDER BY scheduled_at, id LIMIT :limit
                """)
                .param("now", Timestamp.from(now)).param("limit", limit).query(UUID.class).list();
    }

    /** Public, indexable articles for the sitemap (seo.indexable not false). */
    public List<ArticleRow> indexable() {
        return withCategories(jdbc.sql(SELECT + " WHERE " + PUBLIC_PREDICATE
                + " AND COALESCE((r.seo ->> 'indexable')::boolean, true) ORDER BY a.display_date DESC, a.id DESC")
                .query(ArticleRepository::map).list());
    }

    public boolean categoryInUse(UUID categoryId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM article_category WHERE category_id = :id)")
                .param("id", categoryId).query(Boolean.class).single();
    }

    /** Assets referenced by current revisions, split by the referencing article's visibility. */
    public boolean assetUsedByCurrentRevision(UUID assetId, String visibility, UUID exceptArticleId) {
        return jdbc.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM article_media_ref m JOIN article a ON a.current_revision_id = m.revision_id
                    WHERE m.asset_id = :asset AND a.visibility = :visibility AND a.status <> 'TRASHED'
                      AND (CAST(:except AS uuid) IS NULL OR a.id <> CAST(:except AS uuid)))
                """)
                .param("asset", assetId).param("visibility", visibility).param("except", exceptArticleId)
                .query(Boolean.class).single();
    }

    public boolean assetPubliclyReferenced(UUID assetId) {
        return jdbc.sql("""
                SELECT EXISTS (
                    SELECT 1 FROM article_media_ref m JOIN article a ON a.current_revision_id = m.revision_id
                    WHERE m.asset_id = :asset AND a.status = 'PUBLISHED' AND a.visibility = 'PUBLIC')
                """)
                .param("asset", assetId).query(Boolean.class).single();
    }

    public boolean assetReferenced(UUID assetId) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM article_media_ref WHERE asset_id = :asset)")
                .param("asset", assetId).query(Boolean.class).single();
    }

    private List<ArticleRow> withCategories(List<ArticleRow> rows) {
        if (rows.isEmpty()) {
            return rows;
        }
        Map<UUID, List<CategoryRow>> categories = new LinkedHashMap<>();
        jdbc.sql("""
                SELECT ac.article_id, cat.id, cat.slug, cat.name, cat.position, cat.version
                FROM article_category ac JOIN category cat ON cat.id = ac.category_id
                WHERE ac.article_id IN (:ids) ORDER BY ac.position
                """)
                .param("ids", rows.stream().map(ArticleRow::id).toList())
                .query((rs, n) -> {
                    categories.computeIfAbsent(rs.getObject("article_id", UUID.class), k -> new ArrayList<>())
                            .add(new CategoryRow(rs.getObject("id", UUID.class), rs.getString("slug"), rs.getString("name"),
                                    rs.getInt("position"), rs.getLong("version")));
                    return null;
                })
                .list();
        return rows.stream().map(row -> row.withCategories(categories.getOrDefault(row.id(), List.of()))).toList();
    }

    private static ArticleRow map(ResultSet rs, int row) throws SQLException {
        return new ArticleRow(rs.getObject("id", UUID.class), rs.getObject("owner_id", UUID.class), rs.getString("status"),
                rs.getString("visibility"), rs.getDate("display_date").toLocalDate(), instant(rs, "first_published_at"),
                instant(rs, "last_published_at"), instant(rs, "public_modified_at"), instant(rs, "scheduled_at"),
                rs.getString("schedule_zone"), rs.getLong("schedule_generation"), rs.getLong("publication_generation"),
                instant(rs, "created_at"), instant(rs, "updated_at"), rs.getLong("version"),
                rs.getObject("revision_id", UUID.class), rs.getInt("revision_number"), rs.getString("title"),
                rs.getString("eyebrow"), rs.getString("abstract"), rs.getString("document"), rs.getString("presentation"),
                rs.getString("seo"), rs.getString("cover_mode"), rs.getObject("cover_asset_id", UUID.class),
                rs.getString("slug"), rs.getObject("series_id", UUID.class), (Integer) rs.getObject("series_position"),
                List.of());
    }

    static Instant instant(ResultSet rs, String column) throws SQLException {
        Timestamp value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    static String likeEscape(String value) {
        return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
