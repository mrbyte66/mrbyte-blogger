package com.satir.editorial.application;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.satir.editorial.application.EditorialViews.ArticleEdit;
import com.satir.editorial.application.EditorialViews.SeriesEdit;
import com.satir.editorial.application.EditorialViews.StudioCategoryView;
import com.satir.editorial.infrastructure.ArticleRepository;
import com.satir.editorial.infrastructure.CategoryRepository;
import com.satir.editorial.infrastructure.EditorialRows.ArticleRow;
import com.satir.editorial.infrastructure.EditorialRows.ChapterRow;
import com.satir.editorial.infrastructure.EditorialRows.PageResult;
import com.satir.editorial.infrastructure.EditorialRows.SeriesRow;
import com.satir.editorial.infrastructure.SeriesRepository;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;

/** Owner-only reads for Studio, including drafts, scheduled, private, archived and trashed content. */
@Service
public class StudioContentQuery {

    private static final Map<String, String> SORTS = Map.of(
            "date_desc", "a.display_date DESC, a.id DESC",
            "created_asc", "a.created_at ASC, a.id ASC",
            "scheduled_asc", "a.scheduled_at ASC NULLS LAST, a.id ASC",
            "scheduled_desc", "a.scheduled_at DESC NULLS LAST, a.id DESC",
            "title_asc", "r.title COLLATE \"tr-TR-x-icu\" ASC, a.id ASC");
    private static final Set<String> ARTICLE_STATUSES = Set.of("draft", "scheduled", "published", "archived", "trashed");
    private static final Set<String> SERIES_STATUSES = Set.of("draft", "published", "archived", "trashed");

    private final ArticleRepository articles;
    private final SeriesRepository series;
    private final CategoryRepository categories;
    private final EditorialAssembler assembler;

    StudioContentQuery(ArticleRepository articles, SeriesRepository series, CategoryRepository categories,
            EditorialAssembler assembler) {
        this.articles = articles;
        this.series = series;
        this.categories = categories;
        this.assembler = assembler;
    }

    @Transactional(readOnly = true)
    public PageResponse<ArticleEdit> articles(String status, String visibility, UUID seriesId, String q, String sort, int page, int size) {
        PageResponse.checkBounds(page, size);
        String sortKey = sort != null ? sort : "scheduled".equals(status) ? "scheduled_asc" : "date_desc";
        String orderBy = SORTS.get(sortKey);
        if (orderBy == null) {
            throw invalid("INVALID_SORT");
        }
        PageResult<ArticleRow> result = articles.page(new ArticleRepository.Filter(
                enumParam(status, ARTICLE_STATUSES), enumParam(visibility, Set.of("public", "private")), seriesId, null,
                PageResponse.query(q), false), orderBy, page, size);
        return PageResponse.of(assembler.edits(result.items()), page, size, result.total(), sortKey);
    }

    /** Every article in any state, newest display date first, for owner statistics. */
    @Transactional(readOnly = true)
    public PageResponse<EditorialViews.ArticleTitle> articleTitles(int page, int size) {
        PageResponse.checkBounds(page, size);
        PageResult<ArticleRow> result = articles.page(new ArticleRepository.Filter(null, null, null, null, null, false),
                "a.display_date DESC, a.id DESC", page, size);
        return PageResponse.of(result.items().stream()
                .map(row -> new EditorialViews.ArticleTitle(row.id(), row.title(), row.status().toLowerCase(Locale.ROOT)))
                .toList(), page, size, result.total(), "date_desc");
    }

    @Transactional(readOnly = true)
    public Optional<ArticleEdit> article(UUID id) {
        return articles.find(id).map(row -> assembler.edits(List.of(row)).getFirst());
    }

    @Transactional(readOnly = true)
    public PageResponse<SeriesEdit> series(String status, String q, int page, int size) {
        PageResponse.checkBounds(page, size);
        PageResult<SeriesRow> result = series.page(enumParam(status, SERIES_STATUSES), PageResponse.query(q), false, page, size);
        Map<UUID, List<ChapterRow>> chapters = series.chapters(result.items().stream().map(SeriesRow::id).toList())
                .stream().collect(Collectors.groupingBy(ChapterRow::seriesId));
        return PageResponse.of(assembler.seriesEdits(result.items(), chapters), page, size, result.total(), "title_asc");
    }

    @Transactional(readOnly = true)
    public Optional<SeriesEdit> seriesById(UUID id) {
        return series.find(id).map(row -> assembler.seriesEdits(List.of(row),
                Map.of(row.id(), series.chapters(List.of(row.id())))).getFirst());
    }

    @Transactional(readOnly = true)
    public List<StudioCategoryView> categories() {
        return categories.all().stream()
                .map(c -> new StudioCategoryView(c.id(), c.slug(), c.name(), c.position(), c.version())).toList();
    }

    private static String enumParam(String value, Set<String> allowed) {
        if (value == null || value.isBlank()) {
            return null;
        }
        if (!allowed.contains(value)) {
            throw invalid("INVALID_FILTER");
        }
        return value.toUpperCase(Locale.ROOT);
    }

    private static ApiException invalid(String code) {
        return new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, code, "Filtre veya sıralama geçersiz");
    }
}
