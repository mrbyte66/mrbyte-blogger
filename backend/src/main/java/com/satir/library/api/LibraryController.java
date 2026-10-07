package com.satir.library.api;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.identity.application.SatirPrincipal;
import com.satir.library.application.LibraryService;
import com.satir.library.application.LibraryService.CollectionView;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.Idempotency;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;

/**
 * The member's own library (API contract §5). Verified accounts only (security config); every
 * operation is scoped to the session's account, and foreign IDs are indistinguishable from missing ones.
 */
@RestController
@RequestMapping("/api/v1/me")
class LibraryController {

    record CollectionWrite(String name) {
    }

    record BookmarkWrite(UUID collectionId) {
    }

    private final LibraryService library;
    private final Idempotency idempotency;

    LibraryController(LibraryService library, Idempotency idempotency) {
        this.library = library;
        this.idempotency = idempotency;
    }

    @GetMapping("/collections")
    Map<String, List<CollectionView>> collections(@AuthenticationPrincipal SatirPrincipal principal) {
        return Map.of("items", library.collections(principal.userId()));
    }

    @PostMapping("/collections")
    ResponseEntity<?> createCollection(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @RequestBody CollectionWrite body) {
        return idempotency.execute(principal.getName(), "POST /me/collections", Idempotency.requireKey(key), body, () -> {
            CollectionView created = library.createCollection(principal.userId(), body.name());
            return ResponseEntity.created(URI.create("/api/v1/me/collections/" + created.id()))
                    .eTag(Preconditions.etag(created.version())).body(created);
        });
    }

    @PatchMapping("/collections/{id}")
    ResponseEntity<CollectionView> renameCollection(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody CollectionWrite body) {
        CollectionView renamed = library.renameCollection(principal.userId(), id, Preconditions.requireVersion(ifMatch), body.name());
        return ResponseEntity.ok().eTag(Preconditions.etag(renamed.version())).body(renamed);
    }

    @DeleteMapping("/collections/{id}")
    ResponseEntity<Void> deleteCollection(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID id,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        library.deleteCollection(principal.userId(), id, Preconditions.requireVersion(ifMatch));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/bookmarks")
    PageResponse<LibraryService.BookmarkItem> bookmarks(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestParam(required = false) UUID collectionId, @RequestParam(required = false) String q,
            @RequestParam(required = false) String sort, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return library.bookmarks(principal.userId(), collectionId, q, sort, page, size);
    }

    /** Target state: retries never create a second bookmark. The body may be omitted. */
    @PutMapping("/bookmarks/{articleId}")
    LibraryService.BookmarkView save(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID articleId,
            @RequestBody(required = false) BookmarkWrite body) {
        return library.save(principal.userId(), articleId, body == null ? null : body.collectionId());
    }

    @DeleteMapping("/bookmarks/{articleId}")
    ResponseEntity<Void> remove(@AuthenticationPrincipal SatirPrincipal principal, @PathVariable UUID articleId) {
        library.remove(principal.userId(), articleId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/article-state")
    Map<String, List<LibraryService.ArticleState>> articleState(@AuthenticationPrincipal SatirPrincipal principal,
            @RequestParam(defaultValue = "") String ids) {
        List<UUID> parsed;
        try {
            parsed = Arrays.stream(ids.split(",")).map(String::strip).filter(s -> !s.isEmpty()).map(UUID::fromString).toList();
        } catch (IllegalArgumentException e) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "INVALID_IDS", "Yazı kimlikleri geçersiz");
        }
        return Map.of("items", library.articleState(principal.userId(), parsed));
    }
}
