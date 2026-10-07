package com.satir.editorial.api;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.editorial.application.EditorialViews;
import com.satir.editorial.application.EditorialViews.ArticleSummary;
import com.satir.editorial.application.EditorialViews.SeriesSummary;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.editorial.application.PublicContentQuery.Resolution;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;

/**
 * Public reads (API contract §3). Hidden, private, draft and scheduled content is a plain 404 —
 * also for the owner, who uses Studio endpoints instead. GETs have no side effects.
 */
@RestController
@RequestMapping("/api/v1")
class PublicEditorialController {

    private final PublicContentQuery query;

    PublicEditorialController(PublicContentQuery query) {
        this.query = query;
    }

    @GetMapping("/categories")
    Map<String, List<EditorialViews.CategoryView>> categories() {
        return Map.of("items", query.categories());
    }

    /** {@code expand=document} additionally returns body blocks (used by server-rendered pages). */
    @GetMapping("/articles")
    PageResponse<ArticleSummary> articles(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) String q,
            @RequestParam(required = false) UUID categoryId, @RequestParam(required = false) String sort,
            @RequestParam(required = false) String expand) {
        return query.articles(page, size, q, categoryId, sort, "document".equals(expand));
    }

    @GetMapping("/articles/by-slug/{slug}")
    Object article(@PathVariable String slug) {
        return query.articleBySlug(slug).map(PublicEditorialController::unwrap).orElseThrow(PublicEditorialController::notFound);
    }

    @GetMapping("/series")
    PageResponse<SeriesSummary> series(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @RequestParam(required = false) String q) {
        return query.series(page, size, q);
    }

    @GetMapping("/series/by-slug/{slug}")
    Object seriesBySlug(@PathVariable String slug) {
        return query.seriesBySlug(slug).map(PublicEditorialController::unwrap).orElseThrow(PublicEditorialController::notFound);
    }

    @GetMapping("/series/{id}/chapters")
    PageResponse<ArticleSummary> chapters(@PathVariable UUID id, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return query.chapters(id, page, size).orElseThrow(PublicEditorialController::notFound);
    }

    private static Object unwrap(Resolution<?> resolution) {
        return switch (resolution) {
            case Resolution.Found<?> found -> found.value();
            case Resolution.Moved<?> moved -> EditorialViews.Redirect.to(moved.canonicalPath());
        };
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı");
    }
}
