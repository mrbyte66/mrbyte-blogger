package com.satir.editorial.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.satir.editorial.infrastructure.EditorialRows.SlugRow;

/**
 * Slug registry: each resource has one current slug; previous slugs stay as aliases of the same
 * resource forever, so an old URL never points at different content.
 */
@Repository
public class SlugRepository {

    private final JdbcClient jdbc;

    SlugRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<SlugRow> find(String kind, String slug) {
        return jdbc.sql("SELECT kind, slug, article_id, series_id, is_current FROM slug_registry WHERE kind = :kind AND slug = :slug")
                .param("kind", kind).param("slug", slug)
                .query((rs, row) -> new SlugRow(rs.getString("kind"), rs.getString("slug"),
                        rs.getObject("article_id", UUID.class), rs.getObject("series_id", UUID.class), rs.getBoolean("is_current")))
                .optional();
    }

    public boolean taken(String kind, String slug) {
        return jdbc.sql("SELECT EXISTS (SELECT 1 FROM slug_registry WHERE kind = :kind AND slug = :slug)")
                .param("kind", kind).param("slug", slug).query(Boolean.class).single();
    }

    /** Makes {@code slug} current for the resource, retiring its previous current slug as an alias. */
    public void setCurrent(String kind, UUID resourceId, String slug, UUID newRowId, Instant now) {
        String column = column(kind);
        jdbc.sql("UPDATE slug_registry SET is_current = FALSE WHERE " + column + " = :id AND is_current")
                .param("id", resourceId).update();
        int reactivated = jdbc.sql("UPDATE slug_registry SET is_current = TRUE WHERE kind = :kind AND slug = :slug AND " + column + " = :id")
                .param("kind", kind).param("slug", slug).param("id", resourceId).update();
        if (reactivated == 0) {
            jdbc.sql("INSERT INTO slug_registry (id, kind, slug, " + column + ", is_current, created_at) VALUES (:rowId, :kind, :slug, :id, TRUE, :now)")
                    .param("rowId", newRowId).param("kind", kind).param("slug", slug).param("id", resourceId)
                    .param("now", Timestamp.from(now)).update();
        }
    }

    private static String column(String kind) {
        return switch (kind) {
            case "ARTICLE" -> "article_id";
            case "SERIES" -> "series_id";
            default -> throw new IllegalArgumentException(kind);
        };
    }
}
