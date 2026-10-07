package com.satir.editorial.api;

import java.net.URI;
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

import com.satir.editorial.api.EditorialRequests.ArticleAction;
import com.satir.editorial.api.EditorialRequests.ArticleCreate;
import com.satir.editorial.api.EditorialRequests.ArticleWrite;
import com.satir.editorial.application.ArticleCommands;
import com.satir.editorial.application.EditorialViews.ArticleEdit;
import com.satir.editorial.application.StudioContentQuery;
import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Idempotency;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;

/** Owner-only article editing (API contract §7). Security config restricts /studio/** to OWNER. */
@RestController
@RequestMapping("/api/v1/studio/articles")
class StudioArticleController {

    private final ArticleCommands commands;
    private final StudioContentQuery query;
    private final Idempotency idempotency;

    StudioArticleController(ArticleCommands commands, StudioContentQuery query, Idempotency idempotency) {
        this.commands = commands;
        this.query = query;
        this.idempotency = idempotency;
    }

    /** {@code expand} is accepted for symmetry with the public list; edit views always include the document. */
    @GetMapping
    PageResponse<ArticleEdit> list(@RequestParam(required = false) String status,
            @RequestParam(required = false) String visibility, @RequestParam(required = false) UUID seriesId,
            @RequestParam(required = false) String q, @RequestParam(required = false) String sort,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return query.articles(status, visibility, seriesId, q, sort, page, size);
    }

    @GetMapping("/{id}")
    ResponseEntity<ArticleEdit> get(@PathVariable UUID id) {
        return withEtag(HttpStatus.OK, load(id));
    }

    @PostMapping
    ResponseEntity<?> create(@AuthenticationPrincipal SatirPrincipal owner,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @RequestBody ArticleCreate body) {
        return idempotency.execute(owner.getName(), "POST /studio/articles", Idempotency.requireKey(key), body, () -> {
            UUID id = commands.create(owner.userId(), body.toInput(), body.privateArticle());
            ArticleEdit created = load(id);
            return ResponseEntity.created(URI.create("/api/v1/studio/articles/" + id))
                    .eTag(Preconditions.etag(created.version())).body(created);
        });
    }

    @PutMapping("/{id}")
    ResponseEntity<ArticleEdit> update(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody ArticleWrite body) {
        commands.update(owner.userId(), id, Preconditions.requireVersion(ifMatch), body.toInput());
        return withEtag(HttpStatus.OK, load(id));
    }

    @PostMapping("/{id}/actions")
    ResponseEntity<?> act(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @RequestBody ArticleAction body) {
        long version = Preconditions.requireVersion(ifMatch);
        return idempotency.execute(owner.getName(), "POST /studio/articles/" + id + "/actions", Idempotency.requireKey(key),
                body, () -> {
                    commands.act(owner.userId(), id, version, body.toInput());
                    return withEtag(HttpStatus.OK, load(id));
                });
    }

    /** Reversible trash; there is no hard delete in V1. */
    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        commands.act(owner.userId(), id, Preconditions.requireVersion(ifMatch),
                new ArticleCommands.ActionInput("trash", null, null, false, null));
        return ResponseEntity.noContent().build();
    }

    private ArticleEdit load(UUID id) {
        return query.article(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı"));
    }

    private static ResponseEntity<ArticleEdit> withEtag(HttpStatus status, ArticleEdit body) {
        return ResponseEntity.status(status).eTag(Preconditions.etag(body.version())).body(body);
    }
}
