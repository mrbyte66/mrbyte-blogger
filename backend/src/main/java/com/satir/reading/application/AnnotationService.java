package com.satir.reading.application;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.EditorialViews.RevisionText;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.validation.ValidationException;
import com.satir.reading.domain.Annotation;
import com.satir.reading.domain.Annotation.Fragment;
import com.satir.reading.domain.Annotation.Kind;
import com.satir.reading.infrastructure.ReadingRepository;
import com.satir.reading.infrastructure.ReadingRepository.AnnotationRow;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

/**
 * Private notes, highlights and underlines (API contract §5). Only the signed-in account's own
 * marks are ever read or written. Marks on articles that are no longer public stay stored but are
 * returned as opaque "unavailable" IDs without quotes, notes or titles.
 */
@Service
public class AnnotationService {

    public record AnnotationView(UUID id, String kind, UUID revisionId, List<Fragment> fragments, String note,
            Instant createdAt, long version) {
    }

    public record Unavailable(UUID id, boolean available) {
    }

    /** {@code items} holds {@link AnnotationView}s, or {@link Unavailable}s when the article is hidden. */
    public record ArticleAnnotations(UUID articleId, Boolean available, UUID revisionId, List<?> items) {
    }

    public record Write(String kind, UUID revisionId, List<Fragment> fragments, String note) {
    }

    public record Saved(AnnotationView annotation, boolean created) {
    }

    public record ImportItem(UUID articleId, UUID revisionId, String kind, List<Fragment> fragments, String note,
            Instant createdAt) {
    }

    public record ImportReport(UUID clientImportId, List<Accepted> accepted, List<Rejected> rejected) {
    }

    public record Accepted(int index, UUID id, UUID articleId) {
    }

    public record Rejected(int index, String code) {
    }

    public static final int MAX_IMPORT_ITEMS = 200;
    private static final TypeReference<List<Fragment>> FRAGMENTS = new TypeReference<>() {
    };

    private final ReadingRepository repository;
    private final PublicContentQuery content;
    private final JsonMapper json;
    private final IdGenerator ids;
    private final Clock clock;

    AnnotationService(ReadingRepository repository, PublicContentQuery content, JsonMapper json, IdGenerator ids, Clock clock) {
        this.repository = repository;
        this.content = content;
        this.json = json;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ArticleAnnotations list(UUID userId, UUID articleId) {
        List<AnnotationRow> rows = repository.annotations(userId, articleId);
        Optional<UUID> current = content.currentPublicRevision(articleId);
        if (current.isEmpty()) {
            return new ArticleAnnotations(articleId, false, null,
                    rows.stream().map(row -> new Unavailable(row.id(), false)).toList());
        }
        return new ArticleAnnotations(articleId, null, current.get(), rows.stream().map(this::view).toList());
    }

    /**
     * Create ({@code If-None-Match: *}) or update ({@code If-Match}). The quote of every fragment is
     * verified against the anchored revision of a public article.
     */
    @Transactional
    public Saved put(UUID userId, UUID articleId, UUID markId, String ifMatch, String ifNoneMatch, Write write) {
        boolean create = ifNoneMatch != null && "*".equals(ifNoneMatch.strip());
        if (!create && (ifMatch == null || ifMatch.isBlank())) {
            Preconditions.requireVersion(ifMatch);
        }
        Kind kind = Annotation.kind(write.kind());
        String note = write.note() == null ? "" : write.note();
        RevisionText text = anchoredText(articleId, write.revisionId());
        Annotation.validate(kind, write.fragments(), note, text.anchors());
        Instant now = clock.instant();
        String fragments = json.writeValueAsString(write.fragments());
        Optional<AnnotationRow> existing = repository.lockAnnotation(userId, markId);
        if (create) {
            if (existing.isPresent()) {
                throw new ApiException(HttpStatus.PRECONDITION_FAILED, "ALREADY_EXISTS", "Bu işaret zaten kayıtlı; sayfayı yenile");
            }
            if (repository.countAnnotations(userId, articleId) >= Annotation.MAX_PER_ARTICLE) {
                throw new ApiException(HttpStatus.CONFLICT, "ANNOTATION_LIMIT", "Bu yazıya en fazla 200 işaret eklenebilir");
            }
            if (!repository.insertAnnotation(new ReadingRepository.NewAnnotation(userId, markId, articleId, text.revisionId(),
                    kind.name(), fragments, note, null, now, now))) {
                throw new ApiException(HttpStatus.PRECONDITION_FAILED, "ALREADY_EXISTS", "Bu işaret zaten kayıtlı; sayfayı yenile");
            }
        } else {
            AnnotationRow row = existing.filter(r -> r.articleId().equals(articleId)).orElseThrow(AnnotationService::notFound);
            Preconditions.check(Preconditions.requireVersion(ifMatch), row.version());
            repository.updateAnnotation(userId, markId, text.revisionId(), kind.name(), fragments, note, now);
        }
        AnnotationRow saved = repository.lockAnnotation(userId, markId).orElseThrow();
        return new Saved(view(saved), create);
    }

    @Transactional
    public void delete(UUID userId, UUID articleId, UUID markId) {
        if (!repository.deleteAnnotation(userId, articleId, markId)) {
            throw notFound();
        }
    }

    /**
     * Imports guest (browser-local) marks after the member explicitly chose to. The same
     * {@code clientImportId} returns the stored report; a different body under it is a conflict.
     * Invalid items are reported individually and never block the valid ones.
     */
    @Transactional
    public ImportReport importMarks(UUID userId, UUID clientImportId, List<ImportItem> items) {
        if (clientImportId == null) {
            throw new ValidationException("clientImportId", "REQUIRED");
        }
        if (items == null || items.isEmpty() || items.size() > MAX_IMPORT_ITEMS) {
            throw new ValidationException("items", items == null || items.isEmpty() ? "REQUIRED" : "LENGTH");
        }
        String hash = sha256(json.writeValueAsString(items));
        Optional<ReadingRepository.StoredImport> stored = repository.lockImport(userId, clientImportId);
        if (stored.isPresent()) {
            if (!stored.get().requestHash().equals(hash)) {
                throw new ApiException(HttpStatus.CONFLICT, "IMPORT_ID_REUSED", "Bu içe aktarma kimliği farklı verilerle kullanıldı");
            }
            return json.readValue(stored.get().reportJson(), ImportReport.class);
        }
        Instant now = clock.instant();
        List<Accepted> accepted = new ArrayList<>();
        List<Rejected> rejected = new ArrayList<>();
        for (int i = 0; i < items.size(); i++) {
            ImportItem item = items.get(i);
            Optional<String> problem = importOne(userId, clientImportId, i, item, now, accepted);
            if (problem.isPresent()) {
                rejected.add(new Rejected(i, problem.get()));
            }
        }
        ImportReport report = new ImportReport(clientImportId, accepted, rejected);
        repository.insertImport(userId, clientImportId, hash, json.writeValueAsString(report), now);
        return report;
    }

    private Optional<String> importOne(UUID userId, UUID clientImportId, int index, ImportItem item, Instant now,
            List<Accepted> accepted) {
        if (item == null || item.articleId() == null || item.revisionId() == null) {
            return Optional.of("INVALID");
        }
        Optional<RevisionText> text = content.revisionText(item.articleId(), item.revisionId());
        if (text.isEmpty()) {
            return Optional.of("NOT_AVAILABLE");
        }
        Kind kind;
        String note = item.note() == null ? "" : item.note();
        try {
            kind = Annotation.kind(item.kind());
            Annotation.validate(kind, item.fragments(), note, text.get().anchors());
        } catch (ValidationException invalid) {
            return Optional.of(invalid.code());
        }
        if (repository.countAnnotations(userId, item.articleId()) >= Annotation.MAX_PER_ARTICLE) {
            return Optional.of("ANNOTATION_LIMIT");
        }
        Instant createdAt = item.createdAt() == null || item.createdAt().isAfter(now) ? now : item.createdAt();
        UUID id = ids.next();
        boolean inserted = repository.insertAnnotation(new ReadingRepository.NewAnnotation(userId, id, item.articleId(),
                item.revisionId(), kind.name(), json.writeValueAsString(item.fragments()), note,
                clientImportId + ":" + index, createdAt, now));
        if (!inserted) {
            return Optional.of("DUPLICATE");
        }
        accepted.add(new Accepted(index, id, item.articleId()));
        return Optional.empty();
    }

    private RevisionText anchoredText(UUID articleId, UUID revisionId) {
        if (revisionId == null) {
            throw new ValidationException("revisionId", "REQUIRED");
        }
        if (content.currentPublicRevision(articleId).isEmpty()) {
            throw notFound();
        }
        return content.revisionText(articleId, revisionId)
                .orElseThrow(() -> new ValidationException("revisionId", "UNKNOWN_REVISION"));
    }

    private AnnotationView view(AnnotationRow row) {
        return new AnnotationView(row.id(), row.kind().toLowerCase(Locale.ROOT), row.revisionId(),
                json.readValue(row.fragmentsJson(), FRAGMENTS), row.note(), row.createdAt(), row.version());
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
