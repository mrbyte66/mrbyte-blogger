package com.satir.editorial.application;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.delivery.application.Outbox;
import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.domain.ArticleLifecycle;
import com.satir.editorial.domain.ArticleLifecycle.Action;
import com.satir.editorial.domain.ArticleLifecycle.State;
import com.satir.editorial.domain.ArticleLifecycle.Status;
import com.satir.editorial.domain.ArticleLifecycle.Visibility;
import com.satir.editorial.domain.EditorialValues;
import com.satir.editorial.domain.EditorialValues.ArticlePresentation;
import com.satir.editorial.domain.EditorialValues.Cover;
import com.satir.editorial.domain.EditorialValues.CoverMode;
import com.satir.editorial.domain.EditorialValues.Seo;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.ArticleRepository.NewRevision;
import com.satir.editorial.infrastructure.ArticleRepository.StateUpdate;
import com.satir.editorial.infrastructure.CategoryRepository;
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
 * Owner article commands (API contract §7). Every command row-locks the article; when series are
 * involved, all locks are taken in UUID order so concurrent commands cannot deadlock. The
 * scheduler uses the same publish path as the owner.
 */
@Service
public class ArticleCommands {

    public static final String PUBLICATION_EMAIL_JOB = "PUBLICATION_EMAIL";

    public record VersionRef(UUID id, long version) {
    }

    public record ArticleInput(String title, String slug, String eyebrow, String abstractText, LocalDate displayDate,
            List<UUID> categoryIds, ArticleDocument document, ArticlePresentation presentation, Seo seo, Cover cover,
            UUID seriesId, List<VersionRef> seriesVersions) {
    }

    public record ActionInput(String action, Instant scheduledAt, String timeZone, boolean publishSeries, Long seriesVersion) {
    }

    private final ArticleRepository articles;
    private final SeriesRepository series;
    private final CategoryRepository categories;
    private final SlugRepository slugs;
    private final MediaService media;
    private final EditorialJson json;
    private final Outbox outbox;
    private final AuditLog audit;
    private final IdGenerator ids;
    private final Clock clock;
    private final ZoneId siteZone;

    ArticleCommands(ArticleRepository articles, SeriesRepository series, CategoryRepository categories,
            SlugRepository slugs, MediaService media, EditorialJson json, Outbox outbox, AuditLog audit,
            IdGenerator ids, Clock clock, @Value("${satir.site.time-zone}") String siteZone) {
        this.articles = articles;
        this.series = series;
        this.categories = categories;
        this.slugs = slugs;
        this.media = media;
        this.json = json;
        this.outbox = outbox;
        this.audit = audit;
        this.ids = ids;
        this.clock = clock;
        this.siteZone = ZoneId.of(siteZone);
    }

    // ---------------------------------------------------------------- create / update

    @Transactional
    public UUID create(UUID ownerId, ArticleInput input, boolean privateArticle) {
        Normalized content = normalize(input, true);
        Instant now = clock.instant();
        UUID id = ids.next();
        UUID revisionId = ids.next();
        String visibility = privateArticle ? "PRIVATE" : "PUBLIC";
        checkSlugFree(content.slug, null);
        checkMediaSharing(id, visibility, content);

        articles.insertArticle(id, ownerId, revisionId, visibility, content.displayDate, now);
        insertRevision(id, revisionId, 1, content, ownerId, now);
        articles.replaceCategories(id, content.categoryIds);
        slugs.setCurrent("ARTICLE", id, content.slug, ids.next(), now);
        if (input.seriesId() != null) {
            changeMembership(id, now, null, input.seriesId(), input.seriesVersions(), true);
        }
        audit.record(ownerId, "ARTICLE_CREATE", "ARTICLE", id, AuditLog.Outcome.SUCCESS);
        return id;
    }

    @Transactional
    public void update(UUID ownerId, UUID id, long expectedVersion, ArticleInput input) {
        Normalized content = normalize(input, false);
        ArticleRow before = articles.find(id).orElseThrow(ArticleCommands::notFound);
        lockInOrder(id, before.seriesId(), input.seriesId());
        ArticleRow row = articles.find(id).orElseThrow(ArticleCommands::notFound);
        Preconditions.check(expectedVersion, row.version());
        Instant now = clock.instant();
        Status status = Status.valueOf(row.status());

        if (status == Status.PUBLISHED || status == Status.SCHEDULED) {
            checkPublishable(content);
        }
        if (status == Status.SCHEDULED && !row.scheduledAt().isAfter(now)) {
            throw new ApiException(HttpStatus.CONFLICT, "SCHEDULE_ALREADY_DUE", "Planlanan zaman geldi; yazıyı yeniden yükle");
        }
        if (!content.slug.equals(row.slug())) {
            checkSlugFree(content.slug, id);
            slugs.setCurrent("ARTICLE", id, content.slug, ids.next(), now);
        }
        checkMediaSharing(id, row.visibility(), content);

        UUID revisionId = ids.next();
        insertRevision(id, revisionId, articles.nextRevisionNumber(id), content, ownerId, now);
        articles.replaceCategories(id, content.categoryIds);
        if (!Objects.equals(row.seriesId(), input.seriesId())) {
            changeMembership(id, now, row.seriesId(), input.seriesId(), input.seriesVersions(), false);
        }
        boolean live = row.isPublic();
        articles.updateState(id, new StateUpdate(row.status(), row.visibility(), content.displayDate,
                row.firstPublishedAt(), row.lastPublishedAt(), live ? now : row.publicModifiedAt(), row.scheduledAt(),
                row.scheduleZone(), row.scheduleGeneration(), row.publicationGeneration(), revisionId, now));
        if (live && row.seriesId() != null && row.seriesId().equals(input.seriesId())) {
            series.touch(row.seriesId(), now);
        }
        audit.record(ownerId, "ARTICLE_UPDATE", "ARTICLE", id, AuditLog.Outcome.SUCCESS);
    }

    // ---------------------------------------------------------------- lifecycle

    @Transactional
    public void act(UUID ownerId, UUID id, long expectedVersion, ActionInput input) {
        Action action = Action.fromWire(input.action());
        if (action == null) {
            throw new ValidationException("action", "INVALID");
        }
        ArticleRow before = articles.find(id).orElseThrow(ArticleCommands::notFound);
        lockInOrder(id, before.seriesId(), null);
        ArticleRow row = articles.find(id).orElseThrow(ArticleCommands::notFound);
        Preconditions.check(expectedVersion, row.version());
        apply(ownerId, row, action, input, clock.instant());
    }

    /** Scheduler entry point: publishes one due article if it is still scheduled, public and valid. */
    @Transactional
    public boolean publishDue(UUID id) {
        Optional<ArticleRow> locked = articles.lock(id);
        if (locked.isEmpty()) {
            return false;
        }
        ArticleRow row = locked.get();
        Instant now = clock.instant();
        if (!"SCHEDULED".equals(row.status()) || !"PUBLIC".equals(row.visibility()) || row.scheduledAt().isAfter(now)) {
            return false; // cancelled, rescheduled or already handled by a concurrent command
        }
        try {
            checkPublishable(Normalized.of(row, json));
        } catch (ValidationException invalid) {
            articles.updateState(id, new StateUpdate("DRAFT", row.visibility(), row.displayDate(), row.firstPublishedAt(),
                    row.lastPublishedAt(), row.publicModifiedAt(), null, null, row.scheduleGeneration() + 1,
                    row.publicationGeneration(), row.revisionId(), now));
            audit.record(null, "ARTICLE_SCHEDULED_PUBLISH", "ARTICLE", id, AuditLog.Outcome.FAILURE);
            return false;
        }
        publish(row, now);
        audit.record(null, "ARTICLE_SCHEDULED_PUBLISH", "ARTICLE", id, AuditLog.Outcome.SUCCESS);
        return true;
    }

    private void apply(UUID ownerId, ArticleRow row, Action action, ActionInput input, Instant now) {
        ArticleLifecycle.Transition transition;
        try {
            transition = ArticleLifecycle.apply(new State(Status.valueOf(row.status()), Visibility.valueOf(row.visibility())), action);
        } catch (ArticleLifecycle.Rejected rejected) {
            throw new ApiException(HttpStatus.CONFLICT, rejected.code(), rejectedTitle(rejected.code()));
        }
        if (!transition.changed()) {
            return; // same-state action: no generation, no mail, no version bump
        }
        if (transition.requiresPublishable()) {
            checkPublishable(Normalized.of(row, json));
        }
        State next = transition.next();
        switch (action) {
            case PUBLISH -> {
                SeriesRow draftSeries = input.publishSeries() ? lockDraftSeries(row, input.seriesVersion()) : null;
                publish(row, now);
                if (draftSeries != null) {
                    series.updateStatus(draftSeries.id(), "PUBLISHED", now, now);
                }
            }
            case SCHEDULE -> schedule(row, input, now);
            case MAKE_PRIVATE -> {
                assertNotSharedWithPublic(row);
                setState(row, next, now, true);
            }
            case PREPARE_PUBLIC -> {
                assertNotSharedWithPrivate(row);
                setState(row, next, now, false);
            }
            default -> setState(row, next, now, row.isPublic());
        }
        audit.record(ownerId, "ARTICLE_" + action.name(), "ARTICLE", row.id(), AuditLog.Outcome.SUCCESS);
    }

    /** Non-published → published: first publish time once, new publication generation and one mail job. */
    private void publish(ArticleRow row, Instant now) {
        long generation = row.publicationGeneration() + 1;
        articles.updateState(row.id(), new StateUpdate("PUBLISHED", row.visibility(), row.displayDate(),
                row.firstPublishedAt() != null ? row.firstPublishedAt() : now, now, now, null, null,
                row.scheduleGeneration() + (row.scheduledAt() != null ? 1 : 0), generation, row.revisionId(), now));
        if (row.seriesId() != null) {
            series.touch(row.seriesId(), now);
        }
        outbox.enqueue(PUBLICATION_EMAIL_JOB, row.id(), generation, "publication-email:" + row.id() + ":" + generation,
                Map.of("articleId", row.id().toString()));
    }

    private void schedule(ArticleRow row, ActionInput input, Instant now) {
        if (input.scheduledAt() == null) {
            throw new ValidationException("scheduledAt", "REQUIRED");
        }
        if (!input.scheduledAt().isAfter(now)) {
            throw new ValidationException("scheduledAt", "IN_PAST");
        }
        ZoneId zone;
        try {
            zone = ZoneId.of(input.timeZone() == null ? "" : input.timeZone());
        } catch (DateTimeException e) {
            throw new ValidationException("timeZone", "INVALID");
        }
        articles.updateState(row.id(), new StateUpdate("SCHEDULED", row.visibility(), row.displayDate(),
                row.firstPublishedAt(), row.lastPublishedAt(), row.publicModifiedAt(), input.scheduledAt(), zone.getId(),
                row.scheduleGeneration() + 1, row.publicationGeneration(), row.revisionId(), now));
    }

    private void setState(ArticleRow row, State next, Instant now, boolean publicChange) {
        boolean leavingSchedule = row.scheduledAt() != null && next.status() != Status.SCHEDULED;
        articles.updateState(row.id(), new StateUpdate(next.status().name(), next.visibility().name(), row.displayDate(),
                row.firstPublishedAt(), row.lastPublishedAt(), publicChange ? now : row.publicModifiedAt(),
                next.status() == Status.SCHEDULED ? row.scheduledAt() : null,
                next.status() == Status.SCHEDULED ? row.scheduleZone() : null,
                row.scheduleGeneration() + (leavingSchedule ? 1 : 0), row.publicationGeneration(), row.revisionId(), now));
        if (publicChange && row.seriesId() != null) {
            series.touch(row.seriesId(), now);
        }
    }

    /** Explicit series activation together with publishing its chapter (Ü6: never implicit). */
    private SeriesRow lockDraftSeries(ArticleRow row, Long seriesVersion) {
        if (row.seriesId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "NOT_IN_SERIES", "Yazı bir seriye bağlı değil");
        }
        if (seriesVersion == null) {
            throw new ValidationException("seriesVersion", "REQUIRED");
        }
        SeriesRow owner = series.find(row.seriesId()).orElseThrow(ArticleCommands::notFound);
        Preconditions.check(seriesVersion, owner.version());
        if (!"DRAFT".equals(owner.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "SERIES_NOT_DRAFT", "Yalnız taslak seri bu yolla yayımlanır");
        }
        return owner;
    }

    // ---------------------------------------------------------------- series membership

    private void changeMembership(UUID articleId, Instant now, UUID oldSeriesId, UUID newSeriesId,
            List<VersionRef> versions, boolean creating) {
        Map<UUID, Long> expected = new HashMap<>();
        if (versions != null) {
            versions.forEach(v -> expected.put(v.id(), v.version()));
        }
        if (oldSeriesId != null) {
            SeriesRow old = series.find(oldSeriesId).orElseThrow(ArticleCommands::notFound);
            requireSeriesVersion(old, expected);
            List<UUID> remaining = new ArrayList<>(chapterIds(oldSeriesId));
            remaining.remove(articleId);
            series.replaceChapters(oldSeriesId, remaining);
            series.touch(oldSeriesId, now);
            if (remaining.isEmpty() && "PUBLISHED".equals(old.status())) {
                series.updateStatus(oldSeriesId, "DRAFT", now, now);
            }
        }
        if (newSeriesId != null) {
            SeriesRow target = series.find(newSeriesId)
                    .filter(s -> !"TRASHED".equals(s.status()))
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "SERIES_UNAVAILABLE", "Seçilen seri bulunamadı"));
            requireSeriesVersion(target, expected);
            series.removeChapter(articleId);
            series.replaceChapters(newSeriesId, insertByCreation(newSeriesId, articleId, creating ? clock.instant() : null));
            series.touch(newSeriesId, now);
        }
    }

    private static void requireSeriesVersion(SeriesRow row, Map<UUID, Long> expected) {
        Long version = expected.get(row.id());
        if (version == null) {
            throw new ValidationException("seriesVersions", "REQUIRED");
        }
        Preconditions.check(version, row.version());
    }

    /** New membership follows immutable creation order; existing relative order is preserved. */
    private List<UUID> insertByCreation(UUID seriesId, UUID articleId, Instant createdAtOverride) {
        List<ChapterRow> chapters = series.chapters(List.of(seriesId));
        Instant created = createdAtOverride != null ? createdAtOverride
                : articles.find(articleId).map(ArticleRow::createdAt).orElseThrow();
        List<UUID> order = new ArrayList<>(chapters.stream().map(ChapterRow::articleId).toList());
        order.remove(articleId);
        int index = order.size();
        for (int i = 0; i < chapters.size(); i++) {
            if (chapters.get(i).createdAt().isAfter(created)) {
                index = order.indexOf(chapters.get(i).articleId());
                break;
            }
        }
        order.add(index, articleId);
        return order;
    }

    private List<UUID> chapterIds(UUID seriesId) {
        return series.chapters(List.of(seriesId)).stream().map(ChapterRow::articleId).toList();
    }

    /** Locks the article and the involved series in global UUID order. */
    private void lockInOrder(UUID articleId, UUID... seriesIds) {
        List<UUID> all = new ArrayList<>();
        all.add(articleId);
        for (UUID s : seriesIds) {
            if (s != null && !all.contains(s)) {
                all.add(s);
            }
        }
        all.sort(Comparator.naturalOrder());
        for (UUID id : all) {
            if (id.equals(articleId)) {
                articles.lock(id).orElseThrow(ArticleCommands::notFound);
            } else {
                series.lock(id);
            }
        }
    }

    // ---------------------------------------------------------------- validation

    /** Input after structural validation and defaults. */
    private record Normalized(String title, String slug, String eyebrow, String abstractText, LocalDate displayDate,
            List<UUID> categoryIds, ArticleDocument document, ArticlePresentation presentation, Seo seo, Cover cover) {

        static Normalized of(ArticleRow row, EditorialJson json) {
            return new Normalized(row.title(), row.slug(), row.eyebrow(), row.abstractText(), row.displayDate(),
                    row.categories().stream().map(c -> c.id()).toList(), json.document(row.documentJson()),
                    json.articlePresentation(row.presentationJson()), json.seo(row.seoJson()),
                    new Cover(CoverMode.valueOf(row.coverMode()), row.coverAssetId()));
        }

        List<UUID> assetIds() {
            List<UUID> all = new ArrayList<>(document.assetIds());
            if (cover.assetId() != null) {
                all.add(cover.assetId());
            }
            return all;
        }
    }

    private Normalized normalize(ArticleInput input, boolean creating) {
        String title = EditorialValues.requireText("title", input.title(), 0, 200);
        String eyebrow = EditorialValues.requireText("eyebrow", input.eyebrow(), 0, 160);
        String abstractText = EditorialValues.requireText("abstract", input.abstractText(), 0, 4000);
        String slug = input.slug() == null || input.slug().isBlank() ? null : input.slug().strip();
        if (slug == null) {
            if (!creating) {
                throw new ValidationException("slug", "REQUIRED");
            }
            String derived = Slugs.fromTitle(title);
            slug = derived.isEmpty() ? "draft-" + UUID.randomUUID().toString().substring(0, 8) : derived;
        }
        if (!Slugs.isValid(slug)) {
            throw new ValidationException("slug", "FORMAT");
        }
        LocalDate displayDate = input.displayDate() != null ? input.displayDate() : LocalDate.now(clock.withZone(siteZone));
        List<UUID> categoryIds = input.categoryIds() == null ? List.of() : List.copyOf(new LinkedHashSet<>(input.categoryIds()));
        if (categoryIds.size() > 10 || (input.categoryIds() != null && categoryIds.size() != input.categoryIds().size())) {
            throw new ValidationException("categoryIds", "INVALID");
        }
        if (categories.countExisting(categoryIds) != categoryIds.size()) {
            throw new ValidationException("categoryIds", "UNKNOWN");
        }
        if (input.document() == null) {
            throw new ValidationException("document", "REQUIRED");
        }
        ArticleDocument document = input.document().validated();
        ArticlePresentation presentation = input.presentation() == null ? ArticlePresentation.defaults() : input.presentation().validated();
        Seo seo = input.seo() == null ? Seo.defaults() : input.seo().validated();
        Cover cover = input.cover() == null ? new Cover(CoverMode.AUTO, null) : input.cover().validated();
        Normalized normalized = new Normalized(title, slug, eyebrow, abstractText, displayDate, categoryIds, document,
                presentation, seo, cover);
        List<UUID> assets = normalized.assetIds();
        if (!media.allReady(assets)) {
            throw new ValidationException(cover.assetId() != null && !media.allReady(List.of(cover.assetId()))
                    ? "cover.assetId" : "document.blocks", "MEDIA_NOT_READY");
        }
        return normalized;
    }

    /** Required before a document can be live or planned (architecture §4). */
    private static void checkPublishable(Normalized content) {
        if (content.title.isBlank()) {
            throw new ValidationException("title", "REQUIRED");
        }
        if (content.categoryIds.isEmpty()) {
            throw new ValidationException("categoryIds", "REQUIRED");
        }
        if (!content.document.hasNonBlankParagraph()) {
            throw new ValidationException("document.blocks", "PARAGRAPH_REQUIRED");
        }
    }

    private void checkSlugFree(String slug, UUID articleId) {
        slugs.find("ARTICLE", slug).ifPresent(entry -> {
            if (!entry.articleId().equals(articleId)) {
                throw new ApiException(HttpStatus.CONFLICT, "SLUG_TAKEN", "Bu kalıcı bağlantı kullanılıyor")
                        .with("suggestedSlug", suggest(slug));
            }
        });
    }

    private String suggest(String slug) {
        for (int i = 2; i < 1000; i++) {
            String suffix = "-" + i;
            String candidate = (slug.length() + suffix.length() > Slugs.MAX_LENGTH
                    ? slug.substring(0, Slugs.MAX_LENGTH - suffix.length()).replaceAll("-+$", "") : slug) + suffix;
            if (!slugs.taken("ARTICLE", candidate)) {
                return candidate;
            }
        }
        return slug + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    /**
     * Assets used by a private article cannot be shared with public content and vice versa
     * (architecture §6); the owner uploads a separate copy instead.
     */
    private void checkMediaSharing(UUID articleId, String visibility, Normalized content) {
        String other = "PRIVATE".equals(visibility) ? "PUBLIC" : "PRIVATE";
        for (UUID asset : new HashSet<>(content.assetIds())) {
            if (articles.assetUsedByCurrentRevision(asset, other, articleId)
                    || ("PRIVATE".equals(visibility) && series.assetReferenced(asset))) {
                throw new ApiException(HttpStatus.CONFLICT, "ASSET_SHARED_ACROSS_VISIBILITY",
                        "Bu görsel farklı görünürlükteki bir içerikte kullanılıyor; ayrı bir kopya yükle");
            }
        }
    }

    private void assertNotSharedWithPublic(ArticleRow row) {
        for (UUID asset : new HashSet<>(Normalized.of(row, json).assetIds())) {
            if (articles.assetUsedByCurrentRevision(asset, "PUBLIC", row.id()) || series.assetReferenced(asset)) {
                throw new ApiException(HttpStatus.CONFLICT, "ASSET_SHARED_ACROSS_VISIBILITY",
                        "Yazının bir görseli herkese açık başka içerikte de kullanılıyor; önce ayır");
            }
        }
    }

    private void assertNotSharedWithPrivate(ArticleRow row) {
        for (UUID asset : new HashSet<>(Normalized.of(row, json).assetIds())) {
            if (articles.assetUsedByCurrentRevision(asset, "PRIVATE", row.id())) {
                throw new ApiException(HttpStatus.CONFLICT, "ASSET_SHARED_ACROSS_VISIBILITY",
                        "Yazının bir görseli özel bir yazıda da kullanılıyor; önce ayır");
            }
        }
    }

    private void insertRevision(UUID articleId, UUID revisionId, int number, Normalized content, UUID authorId, Instant now) {
        articles.insertRevision(new NewRevision(revisionId, articleId, number, content.title, content.eyebrow,
                content.abstractText, json.write(content.document), json.write(content.presentation), json.write(content.seo),
                content.cover.mode().name(), content.cover.assetId(), authorId, now));
        articles.insertMediaRefs(revisionId, articleId, content.cover.assetId(), content.document.assetIds());
    }

    private static String rejectedTitle(String code) {
        return switch (code) {
            case "PRIVATE_NOT_PUBLISHABLE" -> "Özel yazı yayımlanamaz; önce kamu yayınına hazırla";
            default -> "Bu işlem yazının şimdiki durumunda yapılamaz";
        };
    }

    static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }
}
