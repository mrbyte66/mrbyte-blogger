package com.satir.site.api;

import java.util.UUID;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.satir.editorial.application.EditorialViews.SeoUrl;
import com.satir.identity.application.SatirPrincipal;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;
import com.satir.site.application.SiteService;
import com.satir.site.application.SiteService.SettingsView;
import com.satir.site.application.SiteService.ThemeWorkspaceView;
import com.satir.site.domain.ThemeDocument;

/** Public site projection, sitemap source and Studio site/theme endpoints (API contract §3, §8). */
@RestController
@RequestMapping("/api/v1")
class SiteController {

    record SettingsPatch(String authorPublicName, SiteService.SiteSeo seo, Boolean indexingEnabled) {
    }

    record ApplyRequest(UUID draftRevisionId) {
    }

    private final SiteService site;

    SiteController(SiteService site) {
        this.site = site;
    }

    @GetMapping("/site")
    SiteService.PublicSite publicSite() {
        return site.publicSite();
    }

    @GetMapping("/seo/urls")
    PageResponse<SeoUrl> seoUrls(@RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        return site.seoUrls(page, size);
    }

    @GetMapping("/studio/site")
    ResponseEntity<SettingsView> settings() {
        SettingsView view = site.settings();
        return ResponseEntity.ok().eTag(Preconditions.etag(view.version())).body(view);
    }

    @PatchMapping("/studio/site")
    ResponseEntity<SettingsView> updateSettings(@AuthenticationPrincipal SatirPrincipal owner,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody SettingsPatch body) {
        SettingsView view = site.updateSettings(owner.userId(), Preconditions.requireVersion(ifMatch),
                body.authorPublicName(), body.seo(), body.indexingEnabled());
        return ResponseEntity.ok().eTag(Preconditions.etag(view.version())).body(view);
    }

    @GetMapping("/studio/theme")
    ResponseEntity<ThemeWorkspaceView> theme() {
        return withEtag(site.theme());
    }

    @PutMapping("/studio/theme/draft")
    ResponseEntity<ThemeWorkspaceView> saveDraft(@AuthenticationPrincipal SatirPrincipal owner,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody ThemeDocument draft) {
        return withEtag(site.saveDraft(owner.userId(), Preconditions.requireVersion(ifMatch), draft));
    }

    @PostMapping("/studio/theme/apply")
    ResponseEntity<ThemeWorkspaceView> apply(@AuthenticationPrincipal SatirPrincipal owner,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch, @RequestBody ApplyRequest body) {
        return withEtag(site.apply(owner.userId(), Preconditions.requireVersion(ifMatch), body.draftRevisionId()));
    }

    @PostMapping("/studio/theme/restore")
    ResponseEntity<ThemeWorkspaceView> restore(@AuthenticationPrincipal SatirPrincipal owner,
            @RequestHeader(value = HttpHeaders.IF_MATCH, required = false) String ifMatch) {
        return withEtag(site.restore(owner.userId(), Preconditions.requireVersion(ifMatch)));
    }

    private static ResponseEntity<ThemeWorkspaceView> withEtag(ThemeWorkspaceView view) {
        return ResponseEntity.ok().eTag(Preconditions.etag(view.version())).body(view);
    }
}
