package com.satir.editorial.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.domain.EditorialValues.ArticlePresentation;
import com.satir.editorial.domain.EditorialValues.Seo;
import com.satir.editorial.domain.EditorialValues.SeriesPresentation;

/**
 * Response shapes from API contract §2. Public views never contain status, private fields,
 * scheduling data or personalisation; edit views are returned only to the owner.
 */
public final class EditorialViews {

    private EditorialViews() {
    }

    public record CategoryView(UUID id, String slug, String name) {
    }

    public record StudioCategoryView(UUID id, String slug, String name, int position, long version) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Attribution(String provider, String photographer, String photographerUrl, String sourceUrl,
            String licenseUrl) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record MediaPublic(UUID id, String url, Integer width, Integer height, Attribution attribution) {
    }

    public record Link(UUID id, String slug, String title, String url) {
    }

    /** Public totals: views, active claps and bookmarks. Never personalised. */
    public record ArticleStats(long views, long claps, long saves) {
        public static final ArticleStats ZERO = new ArticleStats(0, 0, 0);

        public ArticleStats plus(ArticleStats other) {
            return new ArticleStats(views + other.views, claps + other.claps, saves + other.saves);
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record ArticleSummary(UUID id, String slug, String url, String title, String eyebrow,
            @com.fasterxml.jackson.annotation.JsonProperty("abstract") String abstractText, String bodyPreview,
            List<CategoryView> categories, LocalDate displayDate, int readingMinutes, MediaPublic cover,
            ArticleStats stats, ArticlePresentation presentation, ArticleDocument document, Integer chapterNumber) {
    }

    public record SeriesNav(UUID id, String slug, String title, int position, int total, Link previous, Link next) {
    }

    public record ArticleDetail(UUID id, String slug, String url, String title, String eyebrow,
            @com.fasterxml.jackson.annotation.JsonProperty("abstract") String abstractText, String bodyPreview,
            List<CategoryView> categories, LocalDate displayDate, int readingMinutes, MediaPublic cover,
            ArticleStats stats, UUID revisionId, ArticleDocument document, ArticlePresentation presentation, Seo seo,
            Instant firstPublishedAt, Instant publicModifiedAt, SeriesNav series) {
    }

    public record Redirect(String resolution, String canonicalPath) {
        public static Redirect to(String path) {
            return new Redirect("redirect", path);
        }
    }

    public record CoverView(String mode, UUID assetId, MediaPublic media) {
    }

    public record SeriesPlacement(UUID seriesId) {
    }

    public record ArticleEdit(UUID id, long version, Instant createdAt, Instant updatedAt, String status,
            String visibility, Instant scheduledAt, String scheduleZone, Instant firstPublishedAt,
            Instant lastPublishedAt, UUID revisionId, String title, String slug, String url, String eyebrow,
            @com.fasterxml.jackson.annotation.JsonProperty("abstract") String abstractText, LocalDate displayDate,
            List<UUID> categoryIds, ArticleDocument document, ArticlePresentation presentation, Seo seo,
            CoverView cover, SeriesPlacement seriesPlacement, int readingMinutes) {
    }

    public record ChapterRef(UUID id, String slug, String title) {
    }

    public record SeriesSummary(UUID id, String slug, String url, String title, String summary, boolean ongoing,
            MediaPublic cover, int chapterCount, ArticleStats stats, SeriesPresentation presentation,
            List<ChapterRef> chapters) {
    }

    public record SeriesDetail(UUID id, String slug, String url, String title, String summary, boolean ongoing,
            MediaPublic cover, int chapterCount, ArticleStats stats, SeriesPresentation presentation, List<ChapterRef> chapters, Seo seo,
            Instant publicModifiedAt) {
    }

    public record SeriesEdit(UUID id, long version, String status, Instant createdAt, Instant updatedAt, String title,
            String slug, String url, String summary, boolean ongoing, CoverView cover, SeriesPresentation presentation,
            Seo seo, List<UUID> chapterIds) {
    }

    public record SeoUrl(String path, Instant lastModified) {
    }

    /** Minimal Studio row for owner statistics. */
    public record ArticleTitle(UUID id, String title, String status) {
    }

    /** Annotatable text of one revision of a public article: block ID (or "abstract") to text. */
    public record RevisionText(UUID articleId, UUID revisionId, java.util.Map<String, String> anchors) {
    }
}
