package com.satir.editorial.domain;

import java.util.UUID;

import com.satir.platform.validation.ValidationException;

/** Small editorial value objects with their contract limits. */
public final class EditorialValues {

    private EditorialValues() {
    }

    public enum CoverMode { AUTO, MANUAL, NONE }

    public record ArticlePresentation(String width, String heading, boolean showMeta) {
        public static ArticlePresentation defaults() {
            return new ArticlePresentation("comfortable", "left", true);
        }

        public ArticlePresentation validated() {
            if (!"comfortable".equals(width) && !"wide".equals(width)) {
                throw new ValidationException("presentation.width", "INVALID");
            }
            if (!"left".equals(heading) && !"center".equals(heading)) {
                throw new ValidationException("presentation.heading", "INVALID");
            }
            return this;
        }
    }

    public record SeriesPresentation(String heading, String chapterStyle) {
        public static SeriesPresentation defaults() {
            return new SeriesPresentation("left", "cards");
        }

        public SeriesPresentation validated() {
            if (!"left".equals(heading) && !"center".equals(heading)) {
                throw new ValidationException("presentation.heading", "INVALID");
            }
            if (!"cards".equals(chapterStyle) && !"rows".equals(chapterStyle)) {
                throw new ValidationException("presentation.chapterStyle", "INVALID");
            }
            return this;
        }
    }

    /** Owner SEO overrides. Canonical URLs are always derived by the server, never written. */
    public record Seo(String title, String description, boolean indexable) {
        public static Seo defaults() {
            return new Seo(null, null, true);
        }

        public Seo validated() {
            if (title != null && title.length() > 200) {
                throw new ValidationException("seo.title", "LENGTH");
            }
            if (description != null && description.length() > 400) {
                throw new ValidationException("seo.description", "LENGTH");
            }
            return new Seo(blankToNull(title), blankToNull(description), indexable);
        }
    }

    public record Cover(CoverMode mode, UUID assetId) {
        public static Cover none() {
            return new Cover(CoverMode.NONE, null);
        }

        public Cover validated() {
            if (mode == null) {
                throw new ValidationException("cover.mode", "REQUIRED");
            }
            if (mode == CoverMode.MANUAL && assetId == null) {
                throw new ValidationException("cover.assetId", "REQUIRED");
            }
            if (mode == CoverMode.NONE && assetId != null) {
                throw new ValidationException("cover.assetId", "INVALID");
            }
            return this;
        }
    }

    public static String requireText(String field, String value, int min, int max) {
        String v = value == null ? "" : value;
        int length = v.codePointCount(0, v.length());
        if (length > max) {
            throw new ValidationException(field, "LENGTH");
        }
        if (min > 0 && v.isBlank()) {
            throw new ValidationException(field, "REQUIRED");
        }
        return v;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
