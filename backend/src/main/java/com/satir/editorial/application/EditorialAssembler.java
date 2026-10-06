package com.satir.editorial.application;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Stream;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

import com.satir.editorial.application.EditorialViews.ArticleDetail;
import com.satir.editorial.application.EditorialViews.ArticleEdit;
import com.satir.editorial.application.EditorialViews.ArticleStats;
import com.satir.editorial.application.EditorialViews.ArticleSummary;
import com.satir.editorial.application.EditorialViews.Attribution;
import com.satir.editorial.application.EditorialViews.CategoryView;
import com.satir.editorial.application.EditorialViews.ChapterRef;
import com.satir.editorial.application.EditorialViews.CoverView;
import com.satir.editorial.application.EditorialViews.MediaPublic;
import com.satir.editorial.application.EditorialViews.SeriesDetail;
import com.satir.editorial.application.EditorialViews.SeriesEdit;
import com.satir.editorial.application.EditorialViews.SeriesNav;
import com.satir.editorial.application.EditorialViews.SeriesPlacement;
import com.satir.editorial.application.EditorialViews.SeriesSummary;
import com.satir.editorial.domain.ArticleDocument;
import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.editorial.infrastructure.EditorialRows.ChapterRow;
import com.satir.editorial.infrastructure.EditorialRows.SeriesRow;
import com.satir.media.application.MediaService;
import com.satir.media.domain.MediaAsset;

/** Converts rows into contract views, loading cover media in one batch per call. */
@Component
class EditorialAssembler {

    private final EditorialJson json;
    private final MediaService media;
    private final ObjectProvider<ArticleStatsSource> statsSource;

    EditorialAssembler(EditorialJson json, MediaService media, ObjectProvider<ArticleStatsSource> statsSource) {
        this.json = json;
        this.media = media;
        this.statsSource = statsSource;
    }

    /** Totals for public articles only; callers never pass hidden articles, so they never contribute. */
    Map<UUID, ArticleStats> stats(Collection<UUID> publicArticleIds) {
        ArticleStatsSource source = statsSource.getIfAvailable();
        if (source == null || publicArticleIds.isEmpty()) {
            return Map.of();
        }
        return source.stats(publicArticleIds.stream().distinct().toList());
    }

    static String articlePath(String slug) {
        return "/yazilar/" + slug;
    }

    static String seriesPath(String slug) {
        return "/seriler/" + slug;
    }

    Map<UUID, MediaAsset> assets(Collection<UUID> ids) {
        Map<UUID, MediaAsset> map = new HashMap<>();
        List<UUID> wanted = ids.stream().filter(Objects::nonNull).distinct().toList();
        media.findAll(wanted).forEach(asset -> map.put(asset.id(), asset));
        return map;
    }

    static MediaPublic mediaPublic(MediaAsset asset) {
        if (asset == null || !"READY".equals(asset.state())) {
            return null;
        }
        Attribution attribution = "UPLOAD".equals(asset.sourceProvider()) ? null
                : new Attribution(asset.sourceProvider().toLowerCase(Locale.ROOT), asset.photographer(),
                        asset.photographerUrl(), asset.sourceUrl(), asset.licenseUrl());
        return new MediaPublic(asset.id(), "/api/v1/media/" + asset.id(), asset.width(), asset.height(), attribution);
    }

    List<ArticleSummary> summaries(List<ArticleRow> rows, boolean withDocument, Map<UUID, Integer> chapterNumbers) {
        Map<UUID, MediaAsset> covers = assets(rows.stream().map(ArticleRow::coverAssetId).toList());
        Map<UUID, ArticleStats> stats = stats(rows.stream().filter(ArticleRow::isPublic).map(ArticleRow::id).toList());
        return rows.stream().map(row -> {
            ArticleDocument document = json.document(row.documentJson());
            return new ArticleSummary(row.id(), row.slug(), articlePath(row.slug()), row.title(), row.eyebrow(),
                    row.abstractText(), document.bodyPreview(200), categories(row), row.displayDate(),
                    document.readingMinutes(), mediaPublic(covers.get(row.coverAssetId())),
                    stats.getOrDefault(row.id(), ArticleStats.ZERO),
                    withDocument ? json.articlePresentation(row.presentationJson()) : null,
                    withDocument ? document : null, chapterNumbers.get(row.id()));
        }).toList();
    }

    ArticleDetail detail(ArticleRow row, SeriesNav series) {
        ArticleDocument document = json.document(row.documentJson());
        MediaAsset cover = row.coverAssetId() == null ? null : assets(List.of(row.coverAssetId())).get(row.coverAssetId());
        return new ArticleDetail(row.id(), row.slug(), articlePath(row.slug()), row.title(), row.eyebrow(),
                row.abstractText(), document.bodyPreview(200), categories(row), row.displayDate(),
                document.readingMinutes(), mediaPublic(cover),
                stats(List.of(row.id())).getOrDefault(row.id(), ArticleStats.ZERO), row.revisionId(), document,
                json.articlePresentation(row.presentationJson()), json.seo(row.seoJson()), row.firstPublishedAt(),
                row.publicModifiedAt(), series);
    }

    List<ArticleEdit> edits(List<ArticleRow> rows) {
        Map<UUID, MediaAsset> covers = assets(rows.stream().map(ArticleRow::coverAssetId).toList());
        return rows.stream().map(row -> {
            ArticleDocument document = json.document(row.documentJson());
            return new ArticleEdit(row.id(), row.version(), row.createdAt(), row.updatedAt(), lower(row.status()),
                    lower(row.visibility()), row.scheduledAt(), row.scheduleZone(), row.firstPublishedAt(),
                    row.lastPublishedAt(), row.revisionId(), row.title(), row.slug(), articlePath(row.slug()),
                    row.eyebrow(), row.abstractText(), row.displayDate(),
                    row.categories().stream().map(c -> c.id()).toList(), document,
                    json.articlePresentation(row.presentationJson()), json.seo(row.seoJson()),
                    new CoverView(lower(row.coverMode()), row.coverAssetId(), mediaPublic(covers.get(row.coverAssetId()))),
                    row.seriesId() == null ? null : new SeriesPlacement(row.seriesId()), document.readingMinutes());
        }).toList();
    }

    List<SeriesSummary> seriesSummaries(List<SeriesRow> rows, Map<UUID, List<ChapterRow>> chapters) {
        Map<UUID, MediaAsset> covers = assets(rows.stream().map(SeriesRow::coverAssetId).toList());
        Map<UUID, ArticleStats> stats = stats(rows.stream()
                .flatMap(row -> publicChapters(chapters.getOrDefault(row.id(), List.of())).stream())
                .map(ChapterRef::id).toList());
        return rows.stream().map(row -> {
            List<ChapterRef> visible = publicChapters(chapters.getOrDefault(row.id(), List.of()));
            ArticleStats total = visible.stream().map(c -> stats.getOrDefault(c.id(), ArticleStats.ZERO))
                    .reduce(ArticleStats.ZERO, ArticleStats::plus);
            return new SeriesSummary(row.id(), row.slug(), seriesPath(row.slug()), row.title(), row.summary(),
                    row.ongoing(), mediaPublic(covers.get(row.coverAssetId())), visible.size(), total,
                    json.seriesPresentation(row.presentationJson()), visible);
        }).toList();
    }

    SeriesDetail seriesDetail(SeriesRow row, List<ChapterRow> chapters) {
        SeriesSummary summary = seriesSummaries(List.of(row), Map.of(row.id(), chapters)).getFirst();
        return new SeriesDetail(summary.id(), summary.slug(), summary.url(), summary.title(), summary.summary(),
                summary.ongoing(), summary.cover(), summary.chapterCount(), summary.stats(), summary.presentation(),
                summary.chapters(),
                json.seo(row.seoJson()), row.publicModifiedAt());
    }

    List<SeriesEdit> seriesEdits(List<SeriesRow> rows, Map<UUID, List<ChapterRow>> chapters) {
        Map<UUID, MediaAsset> covers = assets(rows.stream().map(SeriesRow::coverAssetId).toList());
        return rows.stream().map(row -> new SeriesEdit(row.id(), row.version(), lower(row.status()), row.createdAt(),
                row.updatedAt(), row.title(), row.slug(), seriesPath(row.slug()), row.summary(), row.ongoing(),
                new CoverView(lower(row.coverMode()), row.coverAssetId(), mediaPublic(covers.get(row.coverAssetId()))),
                json.seriesPresentation(row.presentationJson()), json.seo(row.seoJson()),
                chapters.getOrDefault(row.id(), List.of()).stream().map(ChapterRow::articleId).toList())).toList();
    }

    /** Navigation inside a series counts only public chapters; hidden positions leave no gaps. */
    static SeriesNav seriesNav(SeriesRow series, List<ChapterRow> chapters, UUID articleId) {
        List<ChapterRow> visible = chapters.stream().filter(ChapterRow::isPublic).toList();
        for (int i = 0; i < visible.size(); i++) {
            if (visible.get(i).articleId().equals(articleId)) {
                ChapterRow previous = i > 0 ? visible.get(i - 1) : null;
                ChapterRow next = i + 1 < visible.size() ? visible.get(i + 1) : null;
                return new SeriesNav(series.id(), series.slug(), series.title(), i + 1, visible.size(), link(previous), link(next));
            }
        }
        return null;
    }

    private static EditorialViews.Link link(ChapterRow chapter) {
        return chapter == null ? null
                : new EditorialViews.Link(chapter.articleId(), chapter.slug(), chapter.title(), articlePath(chapter.slug()));
    }

    static List<ChapterRef> publicChapters(List<ChapterRow> chapters) {
        return chapters.stream().filter(ChapterRow::isPublic)
                .map(c -> new ChapterRef(c.articleId(), c.slug(), c.title())).toList();
    }

    private static List<CategoryView> categories(ArticleRow row) {
        return row.categories().stream().map(c -> new CategoryView(c.id(), c.slug(), c.name())).toList();
    }

    static String lower(String value) {
        return value == null ? null : value.toLowerCase(Locale.ROOT);
    }

    static <T> Stream<T> nonNull(Stream<T> stream) {
        return stream.filter(Objects::nonNull);
    }
}
