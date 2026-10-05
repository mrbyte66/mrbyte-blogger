package com.satir.editorial.api;

import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.delivery.application.JobAdmin;
import com.satir.editorial.api.EditorialRequests.CategoryWrite;
import com.satir.editorial.application.ArticleCommands;
import com.satir.editorial.application.CategoryCommands;
import com.satir.editorial.application.EditorialViews.StudioCategoryView;
import com.satir.editorial.application.StudioContentQuery;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;

/** Studio categories and publication-mail job overview (API contract §7). */
@RestController
@RequestMapping("/api/v1/studio")
class StudioEditorialMiscController {

    private static final List<String> PUBLICATION_JOBS = List.of(ArticleCommands.PUBLICATION_EMAIL_JOB);

    private final CategoryCommands categories;
    private final StudioContentQuery query;
    private final JobAdmin jobs;

    StudioEditorialMiscController(CategoryCommands categories, StudioContentQuery query, JobAdmin jobs) {
        this.categories = categories;
        this.query = query;
        this.jobs = jobs;
    }

    @GetMapping("/categories")
    Map<String, List<StudioCategoryView>> categories() {
        return Map.of("items", query.categories());
    }

    @PostMapping("/categories")
    ResponseEntity<StudioCategoryView> createCategory(@RequestBody CategoryWrite body) {
        UUID id = categories.create(body.name(), body.slug());
        StudioCategoryView created = find(id);
        return ResponseEntity.created(URI.create("/api/v1/studio/categories/" + id)).eTag(Preconditions.etag(created.version())).body(created);
    }

    @PatchMapping("/categories/{id}")
    ResponseEntity<StudioCategoryView> updateCategory(@PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody CategoryWrite body) {
        categories.update(id, Preconditions.requireVersion(ifMatch), body.name(), body.slug());
        StudioCategoryView updated = find(id);
        return ResponseEntity.ok().eTag(Preconditions.etag(updated.version())).body(updated);
    }

    @DeleteMapping("/categories/{id}")
    ResponseEntity<Void> deleteCategory(@PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        categories.delete(id, Preconditions.requireVersion(ifMatch));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/publication-jobs")
    PageResponse<JobAdmin.JobView> publicationJobs(@RequestParam(required = false) String state,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return jobs.list(PUBLICATION_JOBS, state, page, size);
    }

    @PostMapping("/publication-jobs/{id}/retry")
    ResponseEntity<Void> retry(@PathVariable UUID id) {
        jobs.retry(id, PUBLICATION_JOBS);
        return ResponseEntity.noContent().build();
    }

    private StudioCategoryView find(UUID id) {
        return query.categories().stream().filter(c -> c.id().equals(id)).findFirst().orElseThrow();
    }
}
