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

import com.satir.editorial.api.EditorialRequests.SeriesAction;
import com.satir.editorial.api.EditorialRequests.SeriesWrite;
import com.satir.editorial.application.EditorialViews.SeriesEdit;
import com.satir.editorial.application.SeriesCommands;
import com.satir.editorial.application.StudioContentQuery;
import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Idempotency;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;

@RestController
@RequestMapping("/api/v1/studio/series")
class StudioSeriesController {

    private final SeriesCommands commands;
    private final StudioContentQuery query;
    private final Idempotency idempotency;

    StudioSeriesController(SeriesCommands commands, StudioContentQuery query, Idempotency idempotency) {
        this.commands = commands;
        this.query = query;
        this.idempotency = idempotency;
    }

    @GetMapping
    PageResponse<SeriesEdit> list(@RequestParam(required = false) String status, @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        return query.series(status, q, page, size);
    }

    @GetMapping("/{id}")
    ResponseEntity<SeriesEdit> get(@PathVariable UUID id) {
        return withEtag(load(id));
    }

    @PostMapping
    ResponseEntity<?> create(@AuthenticationPrincipal SatirPrincipal owner,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @RequestBody SeriesWrite body) {
        return idempotency.execute(owner.getName(), "POST /studio/series", Idempotency.requireKey(key), body, () -> {
            UUID id = commands.create(owner.userId(), body.toInput());
            SeriesEdit created = load(id);
            return ResponseEntity.created(URI.create("/api/v1/studio/series/" + id))
                    .eTag(Preconditions.etag(created.version())).body(created);
        });
    }

    @PutMapping("/{id}")
    ResponseEntity<SeriesEdit> update(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody SeriesWrite body) {
        commands.update(owner.userId(), id, Preconditions.requireVersion(ifMatch), body.toInput());
        return withEtag(load(id));
    }

    @PostMapping("/{id}/actions")
    ResponseEntity<?> act(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @RequestBody SeriesAction body) {
        long version = Preconditions.requireVersion(ifMatch);
        return idempotency.execute(owner.getName(), "POST /studio/series/" + id + "/actions", Idempotency.requireKey(key),
                body, () -> {
                    commands.act(owner.userId(), id, version, body.action());
                    return withEtag(load(id));
                });
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        commands.act(owner.userId(), id, Preconditions.requireVersion(ifMatch), "trash");
        return ResponseEntity.noContent().build();
    }

    private SeriesEdit load(UUID id) {
        return query.seriesById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "NOT_FOUND", "Bulunamadı"));
    }

    private static ResponseEntity<SeriesEdit> withEtag(SeriesEdit body) {
        return ResponseEntity.ok().eTag(Preconditions.etag(body.version())).body(body);
    }
}
