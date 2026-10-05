package com.satir.editorial.api;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.satir.editorial.application.ArticleCommands;
import com.satir.editorial.application.ArticleCommands.VersionRef;
import com.satir.editorial.application.SeriesCommands;
import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.domain.EditorialValues.ArticlePresentation;
import com.satir.editorial.domain.EditorialValues.Cover;
import com.satir.editorial.domain.EditorialValues.CoverMode;
import com.satir.editorial.domain.EditorialValues.Seo;
import com.satir.editorial.domain.EditorialValues.SeriesPresentation;
import com.satir.platform.validation.ValidationException;

/** Request bodies (API contract §2/§7). Unknown fields are rejected globally with 422. */
final class EditorialRequests {

    private EditorialRequests() {
    }

    record CoverInput(String mode, UUID assetId) {
        Cover toCover() {
            if (mode == null) {
                throw new ValidationException("cover.mode", "REQUIRED");
            }
            try {
                return new Cover(CoverMode.valueOf(mode.toUpperCase(Locale.ROOT)), assetId);
            } catch (IllegalArgumentException e) {
                throw new ValidationException("cover.mode", "INVALID");
            }
        }
    }

    record SeriesPlacementInput(UUID seriesId) {
    }

    /** Full replacement of an article's editable content (PUT). */
    record ArticleWrite(String title, String slug, String eyebrow, @JsonProperty("abstract") String abstractText,
            LocalDate displayDate, List<UUID> categoryIds, ArticleDocument document, ArticlePresentation presentation,
            Seo seo, CoverInput cover, SeriesPlacementInput seriesPlacement, List<VersionRef> seriesVersions) {

        ArticleCommands.ArticleInput toInput() {
            return new ArticleCommands.ArticleInput(title, slug, eyebrow, abstractText, displayDate, categoryIds, document,
                    presentation, seo, cover == null ? null : cover.toCover(),
                    seriesPlacement == null ? null : seriesPlacement.seriesId(), seriesVersions);
        }
    }

    /** Create: same fields; visibility can only be chosen here ("public" default or "private"). */
    record ArticleCreate(String title, String slug, String eyebrow, @JsonProperty("abstract") String abstractText,
            LocalDate displayDate, List<UUID> categoryIds, ArticleDocument document, ArticlePresentation presentation,
            Seo seo, CoverInput cover, SeriesPlacementInput seriesPlacement, List<VersionRef> seriesVersions,
            String visibility) {

        ArticleCommands.ArticleInput toInput() {
            return new ArticleWrite(title, slug, eyebrow, abstractText, displayDate, categoryIds, document, presentation,
                    seo, cover, seriesPlacement, seriesVersions).toInput();
        }

        boolean privateArticle() {
            if (visibility == null || "public".equals(visibility)) {
                return false;
            }
            if ("private".equals(visibility)) {
                return true;
            }
            throw new ValidationException("visibility", "INVALID");
        }
    }

    record ArticleAction(String action, Instant scheduledAt, String timeZone, Boolean publishSeries, Long seriesVersion) {
        ArticleCommands.ActionInput toInput() {
            return new ArticleCommands.ActionInput(action, scheduledAt, timeZone, Boolean.TRUE.equals(publishSeries), seriesVersion);
        }
    }

    record SeriesWrite(String title, String slug, String summary, Boolean ongoing, CoverInput cover,
            SeriesPresentation presentation, Seo seo, List<UUID> chapterIds, List<VersionRef> articleVersions) {

        SeriesCommands.SeriesInput toInput() {
            return new SeriesCommands.SeriesInput(title, slug, summary, ongoing, cover == null ? null : cover.toCover(),
                    presentation, seo, chapterIds, articleVersions);
        }
    }

    record SeriesAction(String action) {
    }

    record CategoryWrite(String name, String slug) {
    }
}
