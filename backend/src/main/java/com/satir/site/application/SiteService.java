package com.satir.site.application;

import java.time.Clock;
import java.util.List;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.satir.editorial.application.EditorialViews.SeoUrl;
import com.satir.editorial.application.PublicContentQuery;
import com.satir.platform.api.ApiException;
import com.satir.platform.api.PageResponse;
import com.satir.platform.api.Preconditions;
import com.satir.platform.audit.AuditLog;
import com.satir.platform.db.IdGenerator;
import com.satir.platform.validation.ValidationException;
import com.satir.site.domain.ThemeDocument;
import com.satir.site.infrastructure.SiteRepository;

import tools.jackson.databind.json.JsonMapper;

/**
 * Site settings and theme workspace. Saving a draft never changes the public site; Apply is a
 * separate, validated pointer switch. Public reads see only the applied snapshot, with any
 * reference to hidden content replaced by {@code null}.
 */
@Service
public class SiteService {

    public record SiteSeo(String title, String description) {
        public SiteSeo validated() {
            if (title != null && title.length() > 200) {
                throw new ValidationException("seo.title", "LENGTH");
            }
            if (description != null && description.length() > 400) {
                throw new ValidationException("seo.description", "LENGTH");
            }
            return this;
        }
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PublicSite(String siteName, ThemeDocument theme, String authorPublicName, SiteSeo seo,
            boolean indexingEnabled, String canonicalOrigin) {
    }

    public record SettingsView(String authorPublicName, SiteSeo seo, boolean indexingEnabled,
            boolean deploymentIndexingEnabled, String canonicalOrigin, long version) {
    }

    public record ThemeWorkspaceView(long version, UUID draftRevisionId, UUID appliedRevisionId, ThemeDocument draft,
            ThemeDocument applied) {
    }

    private static final int MAX_THEME_BYTES = 256 * 1024;

    private final SiteRepository site;
    private final PublicContentQuery content;
    private final JsonMapper json;
    private final IdGenerator ids;
    private final Clock clock;
    private final AuditLog audit;
    private final boolean deploymentIndexing;
    private final String canonicalOrigin;

    SiteService(SiteRepository site, PublicContentQuery content, JsonMapper json, IdGenerator ids, Clock clock,
            AuditLog audit, @Value("${satir.site.indexing-enabled}") boolean deploymentIndexing,
            @Value("${satir.site.public-origin}") String canonicalOrigin) {
        this.site = site;
        this.content = content;
        this.json = json;
        this.ids = ids;
        this.clock = clock;
        this.audit = audit;
        this.deploymentIndexing = deploymentIndexing;
        this.canonicalOrigin = canonicalOrigin.replaceAll("/+$", "");
    }

    // ---------------------------------------------------------------- public

    @Transactional(readOnly = true)
    public PublicSite publicSite() {
        SiteRepository.Settings settings = site.settings(false);
        ThemeDocument applied = site.revisionPayload(site.workspace(false).appliedRevisionId())
                .map(this::parse).map(this::withoutHiddenBindings).orElse(null);
        return new PublicSite(applied == null ? null : applied.siteName(), applied, settings.authorPublicName(),
                seo(settings), indexingOpen(settings), canonicalOrigin);
    }

    /** Sitemap source: empty unless both the owner setting and the deployment gate allow indexing. */
    @Transactional(readOnly = true)
    public PageResponse<SeoUrl> seoUrls(int page, int size) {
        PageResponse.checkBounds(page, size);
        if (!indexingOpen(site.settings(false))) {
            return PageResponse.of(List.of(), page, size, 0, "path");
        }
        List<SeoUrl> all = content.indexableUrls();
        int from = Math.min(page * size, all.size());
        return PageResponse.of(all.subList(from, Math.min(from + size, all.size())), page, size, all.size(), "path");
    }

    // ---------------------------------------------------------------- studio settings

    @Transactional(readOnly = true)
    public SettingsView settings() {
        SiteRepository.Settings settings = site.settings(false);
        return new SettingsView(settings.authorPublicName(), seo(settings), settings.indexingEnabled(), deploymentIndexing,
                canonicalOrigin, settings.version());
    }

    @Transactional
    public SettingsView updateSettings(UUID ownerId, long expectedVersion, String authorPublicName, SiteSeo seo,
            Boolean indexingEnabled) {
        SiteRepository.Settings current = site.settings(true);
        Preconditions.check(expectedVersion, current.version());
        String author = authorPublicName == null ? current.authorPublicName() : authorPublicName.strip();
        if (author != null && author.length() > 80) {
            throw new ValidationException("authorPublicName", "LENGTH");
        }
        SiteSeo nextSeo = seo == null ? seo(current) : seo.validated();
        boolean indexing = indexingEnabled == null ? current.indexingEnabled() : indexingEnabled;
        site.updateSettings(author == null || author.isEmpty() ? null : author, json.writeValueAsString(nextSeo), indexing,
                clock.instant());
        audit.record(ownerId, "SITE_SETTINGS_UPDATE", "SITE", null, AuditLog.Outcome.SUCCESS);
        return settings();
    }

    // ---------------------------------------------------------------- studio theme

    @Transactional(readOnly = true)
    public ThemeWorkspaceView theme() {
        SiteRepository.Workspace workspace = site.workspace(false);
        return new ThemeWorkspaceView(workspace.version(), workspace.draftRevisionId(), workspace.appliedRevisionId(),
                site.revisionPayload(workspace.draftRevisionId()).map(this::parse).orElse(null),
                site.revisionPayload(workspace.appliedRevisionId()).map(this::parse).orElse(null));
    }

    @Transactional
    public ThemeWorkspaceView saveDraft(UUID ownerId, long expectedVersion, ThemeDocument draft) {
        SiteRepository.Workspace workspace = site.workspace(true);
        Preconditions.check(expectedVersion, workspace.version());
        ThemeDocument valid = requireDraft(draft);
        checkReferencesExist(valid);
        UUID revisionId = storeRevision(valid, ownerId);
        site.setWorkspace(revisionId, workspace.appliedRevisionId(), clock.instant());
        return theme();
    }

    @Transactional
    public ThemeWorkspaceView apply(UUID ownerId, long expectedVersion, UUID draftRevisionId) {
        SiteRepository.Workspace workspace = site.workspace(true);
        Preconditions.check(expectedVersion, workspace.version());
        if (draftRevisionId == null || !draftRevisionId.equals(workspace.draftRevisionId())) {
            throw new ApiException(HttpStatus.CONFLICT, "DRAFT_CHANGED", "Taslak değişti; yeniden yükleyip tekrar uygula");
        }
        ThemeDocument draft = site.revisionPayload(draftRevisionId).map(this::parse).orElseThrow();
        draft.validatedForApply();
        checkReferencesPublic(draft);
        site.setWorkspace(workspace.draftRevisionId(), draftRevisionId, clock.instant());
        audit.record(ownerId, "THEME_APPLY", "THEME", draftRevisionId, AuditLog.Outcome.SUCCESS);
        return theme();
    }

    /** Copies the applied theme into a new draft revision; the public site does not change. */
    @Transactional
    public ThemeWorkspaceView restore(UUID ownerId, long expectedVersion) {
        SiteRepository.Workspace workspace = site.workspace(true);
        Preconditions.check(expectedVersion, workspace.version());
        if (workspace.appliedRevisionId() == null) {
            throw new ApiException(HttpStatus.CONFLICT, "NOTHING_APPLIED", "Henüz uygulanmış bir tema yok");
        }
        ThemeDocument applied = site.revisionPayload(workspace.appliedRevisionId()).map(this::parse).orElseThrow();
        UUID revisionId = storeRevision(applied, ownerId);
        site.setWorkspace(revisionId, workspace.appliedRevisionId(), clock.instant());
        return theme();
    }

    // ---------------------------------------------------------------- helpers

    private ThemeDocument requireDraft(ThemeDocument draft) {
        if (draft == null) {
            throw new ValidationException("draft", "REQUIRED");
        }
        ThemeDocument valid = draft.validated();
        if (json.writeValueAsBytes(valid).length > MAX_THEME_BYTES) {
            throw new ApiException(HttpStatus.CONTENT_TOO_LARGE, "THEME_TOO_LARGE", "Tema çok büyük");
        }
        return valid;
    }

    private UUID storeRevision(ThemeDocument theme, UUID ownerId) {
        UUID id = ids.next();
        site.insertRevision(id, json.writeValueAsString(theme), ownerId, clock.instant());
        return id;
    }

    /** Drafts may reference unpublished content (preview is owner-only) but not unknown categories. */
    private void checkReferencesExist(ThemeDocument theme) {
        for (ThemeDocument.Block block : theme.blocks()) {
            if (block instanceof ThemeDocument.Articles articles && articles.categoryId() != null
                    && !content.categoryExists(articles.categoryId())) {
                throw new ValidationException("blocks.categoryId", "UNKNOWN");
            }
        }
    }

    /** Applying makes the theme public: featured content must currently be public. */
    private void checkReferencesPublic(ThemeDocument theme) {
        checkReferencesExist(theme);
        for (ThemeDocument.Block block : theme.blocks()) {
            if (block instanceof ThemeDocument.Scene scene) {
                if (scene.featuredArticleId() != null && !content.isArticlePublic(scene.featuredArticleId())) {
                    throw new ValidationException("blocks.featuredArticleId", "NOT_PUBLIC");
                }
                if (scene.featuredSeriesId() != null && !content.isSeriesPublic(scene.featuredSeriesId())) {
                    throw new ValidationException("blocks.featuredSeriesId", "NOT_PUBLIC");
                }
            }
        }
    }

    /** Content hidden after Apply is unbound in the public projection (no id, title or cover leaks). */
    private ThemeDocument withoutHiddenBindings(ThemeDocument theme) {
        return theme.withBlocks(theme.blocks().stream().map(block -> {
            if (block instanceof ThemeDocument.Scene scene) {
                UUID article = scene.featuredArticleId() != null && content.isArticlePublic(scene.featuredArticleId())
                        ? scene.featuredArticleId() : null;
                UUID series = scene.featuredSeriesId() != null && content.isSeriesPublic(scene.featuredSeriesId())
                        ? scene.featuredSeriesId() : null;
                return (ThemeDocument.Block) scene.withBindings(article, series);
            }
            return block;
        }).toList());
    }

    private boolean indexingOpen(SiteRepository.Settings settings) {
        return deploymentIndexing && settings.indexingEnabled();
    }

    private SiteSeo seo(SiteRepository.Settings settings) {
        return json.readValue(settings.seoJson(), SiteSeo.class);
    }

    private ThemeDocument parse(String payload) {
        return json.readValue(payload, ThemeDocument.class);
    }
}
