package com.satir.reading.api;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;
import com.satir.reading.application.AnnotationService;
import com.satir.reading.application.AnnotationService.AnnotationView;
import com.satir.reading.application.HistoryService;

/**
 * The member's own marks, imports and visit history (API contract §5). The account always comes
 * from the session; another member's mark ID is simply "not found".
 */
@RestController
@RequestMapping("/api/v1/me")
class ReadingController {

    record ImportRequest(UUID clientImportId, List<AnnotationService.ImportItem> items) {
    }

    record VisitRequest(UUID eventId, UUID articleId, UUID revisionId, Instant visitedAt) {
    }

    private final AnnotationService annotations;
    private final HistoryService history;

    ReadingController(AnnotationService annotations, HistoryService history) {
        this.annotations = annotations;
        this.history = history;
    }

    @GetMapping("/articles/{articleId}/annotations")
    AnnotationService.ArticleAnnotations list(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID articleId) {
        return annotations.list(principal.userId(), articleId);
    }

    @PutMapping("/articles/{articleId}/annotations/{markId}")
    ResponseEntity<AnnotationView> put(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID articleId,
            @PathVariable UUID markId, @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch,
            @RequestBody AnnotationService.Write body) {
        AnnotationService.Saved saved = annotations.put(principal.userId(), articleId, markId, ifMatch, ifNoneMatch, body);
        ResponseEntity.BodyBuilder response = saved.created()
                ? ResponseEntity.created(URI.create("/api/v1/me/articles/" + articleId + "/annotations/" + markId))
                : ResponseEntity.ok();
        return response.eTag(Preconditions.etag(saved.annotation().version())).body(saved.annotation());
    }

    @DeleteMapping("/articles/{articleId}/annotations/{markId}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID articleId,
            @PathVariable UUID markId) {
        annotations.delete(principal.userId(), articleId, markId);
        return ResponseEntity.noContent().build();
    }

    /** {@code clientImportId} is this endpoint's own idempotency key (no Idempotency-Key header). */
    @PostMapping("/imports/annotations")
    AnnotationService.ImportReport importAnnotations(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestBody ImportRequest body) {
        return annotations.importMarks(principal.userId(), body.clientImportId(), body.items());
    }

    @PostMapping("/visits")
    ResponseEntity<Void> visit(@AuthenticationPrincipal SatirPrincipal principal, @RequestBody VisitRequest body) {
        history.recordVisit(principal.userId(), body.eventId(), body.articleId(), body.revisionId(), body.visitedAt());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/history")
    PageResponse<HistoryService.HistoryItem> history(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return history.history(principal.userId(), page, size);
    }

    @GetMapping("/series/{seriesId}/history")
    Map<String, List<HistoryService.SeriesVisit>> seriesHistory(@AuthenticationPrincipal SatirPrincipal principal,
            @PathVariable UUID seriesId) {
        return Map.of("items", history.seriesHistory(principal.userId(), seriesId));
    }

    @DeleteMapping("/history")
    ResponseEntity<Void> clearHistory(@AuthenticationPrincipal SatirPrincipal principal) {
        history.clear(principal.userId());
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
}
