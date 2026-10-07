package com.satir.media.application;

import java.sql.Timestamp;
import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.media.domain.MediaAsset;
import com.satir.media.infrastructure.PexelsClient;
import com.satir.media.infrastructure.PexelsClient.Candidate;
import com.satir.platform.api.ApiException;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.validation.ValidationException;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Owner-initiated licensed cover search. Only the query the owner typed is sent to the provider —
 * never an article's title or body, so private writing does not leak. Choosing a candidate stores
 * a local, re-encoded copy with provider/photographer/license attribution; visits never call out.
 */
@Service
public class CoverSearchService {

    public record CoverJob(UUID id, String state, List<Candidate> candidates, String errorCode) {
    }

    private final PexelsClient pexels;
    private final MediaService media;
    private final JdbcClient jdbc;
    private final JsonMapper json;
    private final IdGenerator ids;
    private final Clock clock;

    CoverSearchService(PexelsClient pexels, MediaService media, JdbcClient jdbc, JsonMapper json, IdGenerator ids, Clock clock) {
        this.pexels = pexels;
        this.media = media;
        this.jdbc = jdbc;
        this.json = json;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional
    public CoverJob search(UUID ownerId, String resourceType, UUID resourceId, String query) {
        if (!pexels.configured()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "COVER_PROVIDER_UNAVAILABLE",
                    "Kapak sağlayıcısı yapılandırılmamış; kendi görselini yükleyebilirsin");
        }
        String type = resourceType == null ? "" : resourceType.toUpperCase(Locale.ROOT);
        if (!type.equals("ARTICLE") && !type.equals("SERIES")) {
            throw new ValidationException("resourceType", "INVALID");
        }
        if (resourceId == null) {
            throw new ValidationException("resourceId", "REQUIRED");
        }
        if (query == null || query.isBlank() || query.length() > 100) {
            throw new ValidationException("query", query == null || query.isBlank() ? "REQUIRED" : "LENGTH");
        }
        Optional<List<Candidate>> result = pexels.search(query.strip());
        UUID id = ids.next();
        jdbc.sql("""
                INSERT INTO cover_job (id, resource_type, resource_id, state, candidates, error_code, created_by, created_at)
                VALUES (:id, :type, :resource, :state, CAST(:candidates AS jsonb), :error, :owner, :now)
                """)
                .param("id", id).param("type", type).param("resource", resourceId)
                .param("state", result.isPresent() ? "DONE" : "FAILED")
                .param("candidates", json.writeValueAsString(result.orElse(List.of())))
                .param("error", result.isPresent() ? null : "PROVIDER_ERROR")
                .param("owner", ownerId).param("now", Timestamp.from(clock.instant()))
                .update();
        return job(id).orElseThrow();
    }

    @Transactional(readOnly = true)
    public Optional<CoverJob> job(UUID id) {
        return jdbc.sql("SELECT id, state, candidates::text AS candidates, error_code FROM cover_job WHERE id = :id")
                .param("id", id)
                .query((rs, row) -> new CoverJob(rs.getObject("id", UUID.class), rs.getString("state").toLowerCase(Locale.ROOT),
                        json.readValue(rs.getString("candidates"), new TypeReference<List<Candidate>>() { }),
                        rs.getString("error_code")))
                .optional();
    }

    /** Downloads the chosen candidate into the private media store (outside any DB transaction). */
    public MediaAsset select(UUID ownerId, UUID jobId, String candidateId) {
        CoverJob job = job(jobId).orElseThrow(MediaService::notFound);
        Candidate candidate = job.candidates().stream().filter(c -> c.candidateId().equals(candidateId)).findFirst()
                .orElseThrow(() -> new ValidationException("candidateId", "UNKNOWN"));
        byte[] bytes = pexels.download(candidate.downloadUrl())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_GATEWAY, "COVER_DOWNLOAD_FAILED", "Görsel indirilemedi"));
        return media.store(bytes, new MediaService.Provenance("PEXELS", candidate.candidateId(), candidate.sourceUrl(),
                candidate.photographer(), candidate.photographerUrl(), candidate.licenseUrl()), ownerId);
    }
}
