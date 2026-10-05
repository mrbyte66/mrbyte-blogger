package com.satir.editorial.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.EditorialViews.ArticleSummary;
import com.satir.editorial.application.EditorialViews.CategoryView;
import com.satir.editorial.application.EditorialViews.SeoUrl;
import com.satir.editorial.application.EditorialViews.SeriesSummary;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.CategoryRepository;
import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.editorial.infrastructure.EditorialRows.ChapterRow;
import com.satir.editorial.infrastructure.EditorialRows.PageResult;
import com.satir.editorial.infrastructure.EditorialRows.SeriesRow;
import com.satir.editorial.infrastructure.EditorialRows.SlugRow;
import com.satir.editorial.infrastructure.SeriesRepository;
import com.satir.editorial.infrastructure.SlugRepository;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;

/**
 * Public reads. One visibility policy everywhere: article = PUBLISHED and PUBLIC; series =
 * PUBLISHED with at least one public chapter. Anything else is indistinguishable from "missing".
 */
@Service
public class PublicContentQuery {

    /** Either a resolved resource or a redirect to the current slug of the same resource. */
    public sealed interface Resolution<T> {
        record Found<T>(T value) implements Resolution<T> {
        }

        record Moved<T>(String canonicalPath) implements Resolution<T> {
        }
    }

    private static final Map<String, String> ARTICLE_SORTS = Map.of(
            "date_desc", "a.display_date DESC, a.id DESC",
            "date_asc", "a.display_date ASC, a.id ASC",
            "title_asc", "r.title COLLATE \"tr-TR-x-icu\" ASC, a.id ASC");

    private final ArticleRepository articles;
    private final SeriesRepository series;
    private final CategoryRepository categories;
    private final SlugRepository slugs;
    private final EditorialAssembler assembler;

    PublicContentQuery(ArticleRepository articles, SeriesRepository series, CategoryRepository categories,
            SlugRepository slugs, EditorialAssembler assembler) {
        this.articles = articles;
        this.series = series;
        this.categories = categories;
        this.slugs = slugs;
        this.assembler = assembler;
    }

    @Transactional(readOnly = true)
    public List<CategoryView> categories() {
        return categories.publiclyUsed().stream().map(c -> new CategoryView(c.id(), c.slug(), c.name())).toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleSummary> articles(int page, int size, String q, UUID categoryId, String sort, boolean withDocument) {
        PageResponse.checkBounds(page, size);
        String sortKey = sort == null ? "date_desc" : sort;
        String orderBy = ARTICLE_SORTS.get(sortKey);
        if (orderBy == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_SORT", "Sıralama geçersiz");
        }
        PageResult<ArticleRow> result = articles.page(
                new ArticleRepository.Filter(null, null, null, categoryId, PageResponse.query(q), true), orderBy, page, size);
        return PageResponse.of(assembler.summaries(result.items(), withDocument, Map.of()), page, size, result.total(), sortKey);
    }

    @Transactional(readOnly = true)
    public Optional<Resolution<EditorialViews.ArticleDetail>> articleBySlug(String slug) {
        return slugs.find("ARTICLE", slug).flatMap(entry -> articles.find(entry.articleId())
                .filter(ArticleRow::isPublic)
                .map(row -> entry.current()
                        ? new Resolution.Found<>(assembler.detail(row, nav(row)))
                        : new Resolution.Moved<>(EditorialAssembler.articlePath(row.slug()))));
    }

    @Transactional(readOnly = true)
    public PageResponse<SeriesSummary> series(int page, int size, String q) {
        PageResponse.checkBounds(page, size);
        PageResult<SeriesRow> result = series.page(null, PageResponse.query(q), true, page, size);
        Map<UUID, List<ChapterRow>> chapters = chaptersBySeries(result.items().stream().map(SeriesRow::id).toList());
        return PageResponse.of(assembler.seriesSummaries(result.items(), chapters), page, size, result.total(), "title_asc");
    }

    @Transactional(readOnly = true)
    public Optional<Resolution<EditorialViews.SeriesDetail>> seriesBySlug(String slug) {
        Optional<SlugRow> entry = slugs.find("SERIES", slug);
        if (entry.isEmpty() || !series.isPublic(entry.get().seriesId())) {
            return Optional.empty();
        }
        SeriesRow row = series.find(entry.get().seriesId()).orElseThrow();
        if (!entry.get().current()) {
            return Optional.of(new Resolution.Moved<>(EditorialAssembler.seriesPath(row.slug())));
        }
        return Optional.of(new Resolution.Found<>(assembler.seriesDetail(row, series.chapters(List.of(row.id())))));
    }

    /** Public chapters only, numbered consecutively in Studio order. */
    @Transactional(readOnly = true)
    public Optional<PageResponse<ArticleSummary>> chapters(UUID seriesId, int page, int size) {
        PageResponse.checkBounds(page, size);
        if (!series.isPublic(seriesId)) {
            return Optional.empty();
        }
        List<ChapterRow> visible = series.chapters(List.of(seriesId)).stream().filter(ChapterRow::isPublic).toList();
        int from = Math.min(page * size, visible.size());
        List<ChapterRow> slice = visible.subList(from, Math.min(from + size, visible.size()));
        Map<UUID, Integer> numbers = new HashMap<>();
        for (int i = 0; i < slice.size(); i++) {
            numbers.put(slice.get(i).articleId(), from + i + 1);
        }
        List<ArticleRow> rows = articles.findAll(slice.stream().map(ChapterRow::articleId).toList());
        return Optional.of(PageResponse.of(assembler.summaries(rows, false, numbers), page, size, visible.size(), "position"));
    }

    @Transactional(readOnly = true)
    public boolean isArticlePublic(UUID id) {
        return articles.find(id).map(ArticleRow::isPublic).orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isSeriesPublic(UUID id) {
        return series.isPublic(id);
    }

    @Transactional(readOnly = true)
    public boolean categoryExists(UUID id) {
        return categories.find(id).isPresent();
    }

    /** Indexable public URLs with their last public modification (never planned/display dates). */
    @Transactional(readOnly = true)
    public List<SeoUrl> indexableUrls() {
        List<SeoUrl> urls = new ArrayList<>();
        for (ArticleRow row : articles.indexable()) {
            Instant modified = row.publicModifiedAt() != null ? row.publicModifiedAt() : row.firstPublishedAt();
            urls.add(new SeoUrl(EditorialAssembler.articlePath(row.slug()), modified));
        }
        for (SeriesRow row : series.indexable()) {
            urls.add(new SeoUrl(EditorialAssembler.seriesPath(row.slug()), row.publicModifiedAt()));
        }
        return urls;
    }

    private EditorialViews.SeriesNav nav(ArticleRow row) {
        if (row.seriesId() == null || !series.isPublic(row.seriesId())) {
            return null;
        }
        SeriesRow owner = series.find(row.seriesId()).orElseThrow();
        return EditorialAssembler.seriesNav(owner, series.chapters(List.of(owner.id())), row.id());
    }

    private Map<UUID, List<ChapterRow>> chaptersBySeries(List<UUID> ids) {
        return series.chapters(ids).stream().collect(Collectors.groupingBy(ChapterRow::seriesId));
    }
}
