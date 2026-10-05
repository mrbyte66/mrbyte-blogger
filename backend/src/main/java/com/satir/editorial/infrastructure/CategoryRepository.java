package com.satir.editorial.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.satir.editorial.infrastructure.EditorialRows.CategoryRow;

@Repository
public class CategoryRepository {

    private static final String SELECT = "SELECT id, slug, name, position, version FROM category";

    private final JdbcClient jdbc;

    CategoryRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public List<CategoryRow> all() {
        return jdbc.sql(SELECT + " ORDER BY position, name COLLATE \"tr-TR-x-icu\"").query(CategoryRow.class).list();
    }

    /** Categories used by at least one public article. */
    public List<CategoryRow> publiclyUsed() {
        return jdbc.sql(SELECT + " cat WHERE EXISTS (SELECT 1 FROM article_category ac JOIN article a ON a.id = ac.article_id "
                + "WHERE ac.category_id = cat.id AND " + ArticleRepository.PUBLIC_PREDICATE + ") ORDER BY position, name COLLATE \"tr-TR-x-icu\"")
                .query(CategoryRow.class).list();
    }

    public Optional<CategoryRow> find(UUID id) {
        return jdbc.sql(SELECT + " WHERE id = :id").param("id", id).query(CategoryRow.class).optional();
    }

    public long countExisting(List<UUID> ids) {
        if (ids.isEmpty()) {
            return 0;
        }
        return jdbc.sql("SELECT count(*) FROM category WHERE id IN (:ids)").param("ids", ids).query(Long.class).single();
    }

    public boolean slugOrNameTaken(String slug, String normalizedName, UUID exceptId) {
        return jdbc.sql("""
                SELECT EXISTS (SELECT 1 FROM category WHERE (slug = :slug OR name_normalized = :name)
                    AND (CAST(:except AS uuid) IS NULL OR id <> CAST(:except AS uuid)))
                """)
                .param("slug", slug).param("name", normalizedName).param("except", exceptId)
                .query(Boolean.class).single();
    }

    public void insert(UUID id, String slug, String name, String normalizedName, Instant now) {
        jdbc.sql("""
                INSERT INTO category (id, slug, name, name_normalized, position, created_at, updated_at)
                VALUES (:id, :slug, :name, :normalized, (SELECT COALESCE(MAX(position), -1) + 1 FROM category), :now, :now)
                """)
                .param("id", id).param("slug", slug).param("name", name).param("normalized", normalizedName)
                .param("now", Timestamp.from(now)).update();
    }

    public int update(UUID id, long expectedVersion, String slug, String name, String normalizedName, Instant now) {
        return jdbc.sql("""
                UPDATE category SET slug = :slug, name = :name, name_normalized = :normalized, updated_at = :now,
                    version = version + 1 WHERE id = :id AND version = :version
                """)
                .param("id", id).param("version", expectedVersion).param("slug", slug).param("name", name)
                .param("normalized", normalizedName).param("now", Timestamp.from(now)).update();
    }

    public int delete(UUID id, long expectedVersion) {
        return jdbc.sql("DELETE FROM category WHERE id = :id AND version = :version")
                .param("id", id).param("version", expectedVersion).update();
    }
}
