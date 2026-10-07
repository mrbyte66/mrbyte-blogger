package com.satir.editorial.application;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.ArticleCommands.VersionRef;
import com.satir.editorial.domain.EditorialValues;
import com.satir.editorial.domain.EditorialValues.Cover;
import com.satir.editorial.domain.EditorialValues.CoverMode;
import com.satir.editorial.domain.EditorialValues.Seo;
import com.satir.editorial.domain.EditorialValues.SeriesPresentation;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.editorial.infrastructure.EditorialRows.ChapterRow;
import com.satir.editorial.infrastructure.EditorialRows.SeriesRow;
import com.satir.editorial.infrastructure.SeriesRepository;
import com.satir.editorial.infrastructure.SlugRepository;
import com.satir.media.application.MediaService;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Preconditions;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.text.Slugs;
import com.satir.platform.validation.ValidationException;

/**
 * Series commands. Membership changes are atomic: series + every added/removed article are
 * locked in UUID order, and added/removed articles must carry their current version.
 * Archiving or trashing a series never changes its articles.
 */
@Service
public class SeriesCommands {

    public record SeriesInput(String title, String slug, String summary, Boolean ongoing, Cover cover,
            SeriesPresentation presentation, Seo seo, List<UUID> chapterIds, List<VersionRef> articleVersions) {
    }

    private static final int MAX_CHAPTERS = 200;

    private final SeriesRepository series;
    private final ArticleRepository articles;
    private final SlugRepository slugs;
    private final MediaService media;
    private final EditorialJson json;
    private final AuditLog audit;
    private final IdGenerator ids;
    private final Clock clock;

    SeriesCommands(SeriesRepository series, ArticleRepository articles, SlugRepository slugs, MediaService media,
            EditorialJson json, AuditLog audit, IdGenerator ids, Clock clock) {
        this.series = series;
        this.articles = articles;
        this.slugs = slugs;
        this.media = media;
        this.json = json;
        this.audit = audit;
        this.ids = ids;
        this.clock = clock;
    }

    @Transactional
    public UUID create(UUID ownerId, SeriesInput input) {
        Normalized content = normalize(input);
        UUID id = ids.next();
        Instant now = clock.instant();
        checkSlugFree(content.slug, null);
        lockArticles(content.chapterIds);
        verifyMembership(id, List.of(), content.chapterIds, input.articleVersions());
        series.insert(id, ownerId, content.fields(json), now);
        slugs.setCurrent("SERIES", id, content.slug, ids.next(), now);
        series.replaceChapters(id, content.chapterIds);
        content.chapterIds.forEach(articleId -> articles.bumpVersion(articleId, now));
        audit.record(ownerId, "SERIES_CREATE", "SERIES", id, AuditLog.Outcome.SUCCESS);
        return id;
    }

    @Transactional
    public void update(UUID ownerId, UUID id, long expectedVersion, SeriesInput input) {
        Normalized content = normalize(input);
        SeriesRow before = series.find(id).orElseThrow(ArticleCommands::notFound);
        List<UUID> current = chapterIds(id);
        Set<UUID> touched = new HashSet<>(current);
        touched.addAll(content.chapterIds);
        lockInOrder(id, touched);
        SeriesRow row = series.find(id).orElseThrow(ArticleCommands::notFound);
        Preconditions.check(expectedVersion, row.version());
        Instant now = clock.instant();
        if (!content.slug.equals(before.slug())) {
            checkSlugFree(content.slug, id);
            slugs.setCurrent("SERIES", id, content.slug, ids.next(), now);
        }
        verifyMembership(id, current, content.chapterIds, input.articleVersions());
        series.update(id, content.fields(json), now);
        if (!current.equals(content.chapterIds)) {
            series.replaceChapters(id, content.chapterIds);
            Set<UUID> changed = new HashSet<>(current);
            changed.addAll(content.chapterIds);
            changed.removeIf(articleId -> current.contains(articleId) && content.chapterIds.contains(articleId));
            changed.forEach(articleId -> articles.bumpVersion(articleId, now));
            series.touch(id, now);
            if (content.chapterIds.isEmpty() && "PUBLISHED".equals(row.status())) {
                series.updateStatus(id, "DRAFT", now, now);
            }
        }
        audit.record(ownerId, "SERIES_UPDATE", "SERIES", id, AuditLog.Outcome.SUCCESS);
    }

    @Transactional
    public void act(UUID ownerId, UUID id, long expectedVersion, String action) {
        SeriesRow row = series.lock(id).orElseThrow(ArticleCommands::notFound);
        Preconditions.check(expectedVersion, row.version());
        String status = row.status();
        String next = switch (action == null ? "" : action) {
            case "publish" -> switch (status) {
                case "DRAFT", "PUBLISHED" -> "PUBLISHED";
                default -> throw invalid();
            };
            case "save-draft" -> switch (status) {
                case "PUBLISHED", "DRAFT" -> "DRAFT";
                default -> throw invalid();
            };
            case "archive" -> switch (status) {
                case "TRASHED" -> throw invalid();
                default -> "ARCHIVED";
            };
            case "trash" -> "TRASHED";
            case "restore" -> switch (status) {
                case "ARCHIVED", "TRASHED", "DRAFT" -> "DRAFT";
                default -> throw invalid();
            };
            default -> throw new ValidationException("action", "INVALID");
        };
        if (next.equals(status)) {
            return;
        }
        Instant now = clock.instant();
        if ("PUBLISHED".equals(next)) {
            boolean hasPublicChapter = series.chapters(List.of(id)).stream().anyMatch(ChapterRow::isPublic);
            if (!hasPublicChapter) {
                throw new ApiException(HttpStatus.CONFLICT, "SERIES_EMPTY", "Seriyi yayımlamak için en az bir yayındaki bölüm gerekli");
            }
        }
        boolean publicChange = "PUBLISHED".equals(next) || "PUBLISHED".equals(status);
        series.updateStatus(id, next, publicChange ? now : null, now);
        audit.record(ownerId, "SERIES_" + action.toUpperCase(Locale.ROOT).replace('-', '_'), "SERIES", id, AuditLog.Outcome.SUCCESS);
    }

    // ---------------------------------------------------------------- helpers

    private record Normalized(String title, String slug, String summary, boolean ongoing, Cover cover,
            SeriesPresentation presentation, Seo seo, List<UUID> chapterIds) {

        SeriesRepository.Fields fields(EditorialJson json) {
            return new SeriesRepository.Fields(title, summary, ongoing, cover.mode().name(), cover.assetId(),
                    json.write(presentation), json.write(seo));
        }
    }

    private Normalized normalize(SeriesInput input) {
        String title = EditorialValues.requireText("title", input.title(), 1, 160).strip();
        String summary = EditorialValues.requireText("summary", input.summary(), 0, 1000);
        String slug = input.slug() == null ? "" : input.slug().strip();
        if (!Slugs.isValid(slug)) {
            throw new ValidationException("slug", slug.isEmpty() ? "REQUIRED" : "FORMAT");
        }
        List<UUID> chapters = input.chapterIds() == null ? List.of() : input.chapterIds();
        if (chapters.size() > MAX_CHAPTERS || new LinkedHashSet<>(chapters).size() != chapters.size()) {
            throw new ValidationException("chapterIds", chapters.size() > MAX_CHAPTERS ? "LENGTH" : "DUPLICATE");
        }
        Cover cover = input.cover() == null ? new Cover(CoverMode.AUTO, null) : input.cover().validated();
        if (cover.assetId() != null) {
            if (!media.allReady(List.of(cover.assetId()))) {
                throw new ValidationException("cover.assetId", "MEDIA_NOT_READY");
            }
            if (articles.assetUsedByCurrentRevision(cover.assetId(), "PRIVATE", null)) {
                throw new ApiException(HttpStatus.CONFLICT, "ASSET_SHARED_ACROSS_VISIBILITY",
                        "Bu görsel özel bir yazıda kullanılıyor; ayrı bir kopya yükle");
            }
        }
        return new Normalized(title, slug, summary, input.ongoing() == null || input.ongoing(), cover,
                input.presentation() == null ? SeriesPresentation.defaults() : input.presentation().validated(),
                input.seo() == null ? Seo.defaults() : input.seo().validated(), List.copyOf(chapters));
    }

    /** Every article exists, belongs to no other series, and added/removed ones carry their current version. */
    private void verifyMembership(UUID seriesId, List<UUID> current, List<UUID> next, List<VersionRef> versions) {
        Map<UUID, Long> expected = new HashMap<>();
        if (versions != null) {
            versions.forEach(v -> expected.put(v.id(), v.version()));
        }
        Map<UUID, ArticleRow> rows = new HashMap<>();
        Set<UUID> union = new LinkedHashSet<>(current);
        union.addAll(next);
        List<UUID> all = new ArrayList<>(union);
        articles.findAll(all).forEach(row -> rows.put(row.id(), row));
        for (UUID articleId : next) {
            ArticleRow row = rows.get(articleId);
            if (row == null) {
                throw new ValidationException("chapterIds", "UNKNOWN");
            }
            if (row.seriesId() != null && !row.seriesId().equals(seriesId)) {
                throw new ApiException(HttpStatus.CONFLICT, "ARTICLE_IN_OTHER_SERIES", "Bir yazı yalnız bir seride yer alabilir")
                        .with("articleId", articleId);
            }
        }
        for (UUID articleId : all) {
            boolean membershipChanges = current.contains(articleId) != next.contains(articleId);
            if (membershipChanges) {
                Long version = expected.get(articleId);
                if (version == null) {
                    throw new ValidationException("articleVersions", "REQUIRED");
                }
                Preconditions.check(version, rows.get(articleId).version());
            }
        }
    }

    private void checkSlugFree(String slug, UUID seriesId) {
        slugs.find("SERIES", slug).ifPresent(entry -> {
            if (!entry.seriesId().equals(seriesId)) {
                throw new ApiException(HttpStatus.CONFLICT, "SLUG_TAKEN", "Bu seri bağlantısı kullanılıyor");
            }
        });
    }

    private List<UUID> chapterIds(UUID seriesId) {
        return series.chapters(List.of(seriesId)).stream().map(ChapterRow::articleId).toList();
    }

    private void lockArticles(List<UUID> articleIds) {
        articleIds.stream().sorted().forEach(articles::lock);
    }

    private void lockInOrder(UUID seriesId, Set<UUID> articleIds) {
        List<UUID> all = new ArrayList<>(articleIds);
        all.add(seriesId);
        all.sort(Comparator.naturalOrder());
        for (UUID id : all) {
            if (id.equals(seriesId)) {
                series.lock(id).orElseThrow(ArticleCommands::notFound);
            } else {
                articles.lock(id);
            }
        }
    }

    private static ApiException invalid() {
        return new ApiException(HttpStatus.CONFLICT, "INVALID_TRANSITION", "Bu işlem serinin şimdiki durumunda yapılamaz");
    }
}
