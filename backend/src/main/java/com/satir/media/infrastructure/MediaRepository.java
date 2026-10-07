package com.satir.media.infrastructure;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import com.satir.media.domain.MediaAsset;

@Repository
public class MediaRepository {

    private final JdbcClient jdbc;

    MediaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public void insert(MediaAsset asset) {
        jdbc.sql("""
                INSERT INTO media_asset (id, storage_key, state, mime, size_bytes, width, height, sha256, source_provider,
                    source_id, source_url, photographer, photographer_url, license_url, error_code, created_by, created_at)
                VALUES (:id, :key, :state, :mime, :size, :width, :height, :sha, :provider, :sourceId, :sourceUrl,
                    :photographer, :photographerUrl, :licenseUrl, :error, :createdBy, :createdAt)
                """)
                .param("id", asset.id()).param("key", asset.storageKey()).param("state", asset.state())
                .param("mime", asset.mime()).param("size", asset.sizeBytes()).param("width", asset.width())
                .param("height", asset.height()).param("sha", asset.sha256()).param("provider", asset.sourceProvider())
                .param("sourceId", asset.sourceId()).param("sourceUrl", asset.sourceUrl())
                .param("photographer", asset.photographer()).param("photographerUrl", asset.photographerUrl())
                .param("licenseUrl", asset.licenseUrl()).param("error", asset.errorCode())
                .param("createdBy", asset.createdBy()).param("createdAt", Timestamp.from(asset.createdAt()))
                .update();
    }

    public Optional<MediaAsset> find(UUID id) {
        return jdbc.sql("SELECT * FROM media_asset WHERE id = :id").param("id", id).query(MediaRepository::map).optional();
    }

    public List<MediaAsset> findAll(Collection<UUID> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return jdbc.sql("SELECT * FROM media_asset WHERE id IN (:ids)").param("ids", ids).query(MediaRepository::map).list();
    }

    public void delete(UUID id) {
        jdbc.sql("DELETE FROM media_asset WHERE id = :id").param("id", id).update();
    }

    private static MediaAsset map(ResultSet rs, int row) throws SQLException {
        return new MediaAsset(rs.getObject("id", UUID.class), rs.getString("storage_key"), rs.getString("state"),
                rs.getString("mime"), (Long) rs.getObject("size_bytes"), (Integer) rs.getObject("width"),
                (Integer) rs.getObject("height"), rs.getString("sha256"), rs.getString("source_provider"),
                rs.getString("source_id"), rs.getString("source_url"), rs.getString("photographer"),
                rs.getString("photographer_url"), rs.getString("license_url"), rs.getString("error_code"),
                rs.getObject("created_by", UUID.class), rs.getTimestamp("created_at").toInstant());
    }
}
