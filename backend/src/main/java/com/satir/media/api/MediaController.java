package com.satir.media.api;

import java.io.IOException;
import java.net.URI;
import java.util.UUID;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.satir.identity.application.Authorities;
import com.satir.identity.application.SatirPrincipal;
import com.satir.media.application.MediaService;
import com.satir.media.domain.MediaAsset;
import com.satir.platform.api.ApiException;

/**
 * Media endpoints. {@code GET /media/{id}} streams bytes only for assets of currently public
 * content (or to the owner); everything else is a 404. Responses are never cached so that taking
 * content private immediately stops serving its images.
 */
@RestController
class MediaController {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record MediaStatus(UUID id, String state, String mime, Long size, Integer width, Integer height, String url,
            String provider, String photographer, String photographerUrl, String sourceUrl, String licenseUrl,
            String errorCode) {

        static MediaStatus of(MediaAsset asset) {
            return new MediaStatus(asset.id(), asset.state().toLowerCase(java.util.Locale.ROOT), asset.mime(),
                    asset.sizeBytes(), asset.width(), asset.height(), "/api/v1/media/" + asset.id(),
                    asset.sourceProvider().toLowerCase(java.util.Locale.ROOT), asset.photographer(),
                    asset.photographerUrl(), asset.sourceUrl(), asset.licenseUrl(), asset.errorCode());
        }
    }

    private final MediaService media;

    MediaController(MediaService media) {
        this.media = media;
    }

    @GetMapping("/api/v1/media/{id}")
    ResponseEntity<Resource> file(@PathVariable UUID id, Authentication authentication) {
        boolean owner = authentication != null
                && authentication.getAuthorities().stream().anyMatch(a -> Authorities.OWNER.equals(a.getAuthority()));
        MediaService.StoredFile file = media.open(id, owner).orElseThrow(MediaService::notFound);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .contentType(MediaType.parseMediaType(file.mime()))
                .header("Content-Disposition", "inline")
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .body(new FileSystemResource(file.path()));
    }

    /** Owner upload. Processed synchronously: the response already reports READY (or an error). */
    @PostMapping("/api/v1/studio/media")
    ResponseEntity<MediaStatus> upload(@AuthenticationPrincipal SatirPrincipal owner, @RequestParam("file") MultipartFile file)
            throws IOException {
        if (file.isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_CONTENT, "MEDIA_EMPTY", "Dosya boş");
        }
        MediaAsset asset = media.store(file.getBytes(), MediaService.Provenance.UPLOAD, owner.userId());
        return ResponseEntity.status(HttpStatus.ACCEPTED).location(URI.create("/api/v1/studio/media/" + asset.id()))
                .body(MediaStatus.of(asset));
    }

    @GetMapping("/api/v1/studio/media/{id}")
    MediaStatus status(@PathVariable UUID id) {
        return media.find(id).map(MediaStatus::of).orElseThrow(MediaService::notFound);
    }

    @DeleteMapping("/api/v1/studio/media/{id}")
    ResponseEntity<Void> delete(@AuthenticationPrincipal SatirPrincipal owner, @PathVariable UUID id) {
        media.delete(id, owner.userId());
        return ResponseEntity.noContent().build();
    }
}
