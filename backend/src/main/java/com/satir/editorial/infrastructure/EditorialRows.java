package com.satir.editorial.infrastructure;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Row shapes read by the editorial repositories. Internal to the editorial module. */
public final class EditorialRows {

    private EditorialRows() {
    }

    public record CategoryRow(UUID id, String slug, String name, int position, long version) {
    }

    public record ArticleRow(UUID id, UUID ownerId, String status, String visibility, LocalDate displayDate,
            Instant firstPublishedAt, Instant lastPublishedAt, Instant publicModifiedAt, Instant scheduledAt,
            String scheduleZone, long scheduleGeneration, long publicationGeneration, Instant createdAt,
            Instant updatedAt, long version, UUID revisionId, int revisionNumber, String title, String eyebrow,
            String abstractText, String documentJson, String presentationJson, String seoJson, String coverMode,
            UUID coverAssetId, String slug, UUID seriesId, Integer seriesPosition, List<CategoryRow> categories) {

        public ArticleRow withCategories(List<CategoryRow> categories) {
            return new ArticleRow(id, ownerId, status, visibility, displayDate, firstPublishedAt, lastPublishedAt,
                    publicModifiedAt, scheduledAt, scheduleZone, scheduleGeneration, publicationGeneration, createdAt,
                    updatedAt, version, revisionId, revisionNumber, title, eyebrow, abstractText, documentJson,
                    presentationJson, seoJson, coverMode, coverAssetId, slug, seriesId, seriesPosition, categories);
        }

        public boolean isPublic() {
            return "PUBLISHED".equals(status) && "PUBLIC".equals(visibility);
        }
    }

    public record SeriesRow(UUID id, UUID ownerId, String title, String summary, String status, boolean ongoing,
            String coverMode, UUID coverAssetId, String presentationJson, String seoJson, Instant publicModifiedAt,
            Instant createdAt, Instant updatedAt, long version, String slug) {
    }

    /** One chapter of a series with the state needed to decide public visibility. */
    public record ChapterRow(UUID seriesId, UUID articleId, int position, String slug, String title, String status,
            String visibility, long articleVersion, Instant createdAt) {

        public boolean isPublic() {
            return "PUBLISHED".equals(status) && "PUBLIC".equals(visibility);
        }
    }

    public record SlugRow(String kind, String slug, UUID articleId, UUID seriesId, boolean current) {
    }

    public record PageResult<T>(List<T> items, long total) {
    }
}
