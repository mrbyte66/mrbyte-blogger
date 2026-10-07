package com.satir.media.api;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.satir.identity.application.SatirPrincipal;
import com.satir.media.application.CoverSearchService;
import com.satir.media.application.CoverSearchService.CoverJob;
import com.satir.media.application.MediaService;

@RestController
@RequestMapping("/api/v1/studio/cover-jobs")
class CoverJobController {

    record SearchRequest(String resourceType, UUID resourceId, Long resourceVersion, String query) {
    }

    record SelectRequest(String candidateId) {
    }

    private final CoverSearchService covers;

    CoverJobController(CoverSearchService covers) {
        this.covers = covers;
    }

    @PostMapping
    ResponseEntity<CoverJob> search(@AuthenticationPrincipal SatirPrincipal owner, @RequestBody SearchRequest body) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(covers.search(owner.userId(), body.resourceType(), body.resourceId(), body.query()));
    }

    @GetMapping("/{id}")
    CoverJob job(@PathVariable UUID id) {
        return covers.job(id).orElseThrow(MediaService::notFound);
    }

    /** Stores the chosen image; the client then sets {@code cover: {mode: "manual", assetId}} on the content. */
    @PostMapping("/{id}/select")
    Map<String, Object> select(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id,
            @RequestBody SelectRequest body) {
        var asset = covers.select(owner.userId(), id, body.candidateId());
        return Map.of("assetId", asset.id(), "url", "/api/v1/media/" + asset.id());
    }
}
