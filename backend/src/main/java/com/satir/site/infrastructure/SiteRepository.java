package com.satir.site.infrastructure;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/** Singleton site settings and theme workspace rows (id = 1). */
@Repository
public class SiteRepository {

    public record Settings(String authorPublicName, String seoJson, boolean indexingEnabled, long version) {
    }

    public record Workspace(UUID draftRevisionId, UUID appliedRevisionId, long version) {
    }

    private final JdbcClient jdbc;

    SiteRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Settings settings(boolean forUpdate) {
        return jdbc.sql("SELECT author_public_name, seo::text AS seo, indexing_enabled, version FROM site_settings WHERE id = 1"
                        + (forUpdate ? " FOR UPDATE" : ""))
                .query((rs, row) -> new Settings(rs.getString("author_public_name"), rs.getString("seo"),
                        rs.getBoolean("indexing_enabled"), rs.getLong("version")))
                .single();
    }

    public void updateSettings(String authorPublicName, String seoJson, boolean indexingEnabled, Instant now) {
        jdbc.sql("""
                UPDATE site_settings SET author_public_name = :author, seo = CAST(:seo AS jsonb), indexing_enabled = :indexing,
                    updated_at = :now, version = version + 1 WHERE id = 1
                """)
                .param("author", authorPublicName).param("seo", seoJson).param("indexing", indexingEnabled)
                .param("now", Timestamp.from(now)).update();
    }

    public Workspace workspace(boolean forUpdate) {
        return jdbc.sql("SELECT draft_revision_id, applied_revision_id, version FROM theme_workspace WHERE id = 1"
                        + (forUpdate ? " FOR UPDATE" : ""))
                .query((rs, row) -> new Workspace(rs.getObject("draft_revision_id", UUID.class),
                        rs.getObject("applied_revision_id", UUID.class), rs.getLong("version")))
                .single();
    }

    public void setWorkspace(UUID draftRevisionId, UUID appliedRevisionId, Instant now) {
        jdbc.sql("""
                UPDATE theme_workspace SET draft_revision_id = :draft, applied_revision_id = :applied, updated_at = :now,
                    version = version + 1 WHERE id = 1
                """)
                .param("draft", draftRevisionId).param("applied", appliedRevisionId).param("now", Timestamp.from(now))
                .update();
    }

    public void insertRevision(UUID id, String payloadJson, UUID createdBy, Instant now) {
        jdbc.sql("""
                INSERT INTO theme_revision (id, schema_version, payload, created_by, created_at)
                VALUES (:id, 1, CAST(:payload AS jsonb), :createdBy, :now)
                """)
                .param("id", id).param("payload", payloadJson).param("createdBy", createdBy).param("now", Timestamp.from(now))
                .update();
    }

    public Optional<String> revisionPayload(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        return jdbc.sql("SELECT payload::text FROM theme_revision WHERE id = :id").param("id", id).query(String.class).optional();
    }
}
