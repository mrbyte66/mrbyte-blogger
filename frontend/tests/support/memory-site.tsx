import { render, type RenderOptions } from "@testing-library/react";
import { useSyncExternalStore, type ReactElement, type ReactNode } from "react";
import { SiteDataValues, articleActions, seriesActions, type ContentState, type StudioOperations, type WorkspaceState } from "../../components/data/SiteData";
import type { Category } from "../../lib/api/categories";
import { ApiError } from "../../lib/api/http";
import { articles as fixtureArticles, type Article } from "../../lib/content";
import { insertChapterByCreation } from "../../lib/articles/metadata";
import { initialSeries, type BlogSeries } from "../../lib/series/model";
import { cloneTheme, createWorkspace, type Workspace } from "../../lib/builder/model";

let counter = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

/**
 * In-memory stand-in for the Studio API with the same observable rules as the backend:
 * server IDs and versions, lifecycle actions, single-series membership, slug uniqueness,
 * explicit theme apply. Failures can be injected to test error reporting.
 */
export class MemorySite {
  articles: Article[];
  series: BlogSeries[];
  categories: Category[];
  workspace: Workspace = createWorkspace();
  failNext: ApiError | null = null;
  calls: string[] = [];
  private listeners = new Set<() => void>();
  private snapshots = new Map<string, { content: ContentState; workspace: WorkspaceState }>();

  constructor(options: { articles?: Article[]; series?: BlogSeries[] } = {}) {
    this.articles = (options.articles ?? fixtureArticles.map((a) => ({ ...a }))).map((a, index) => ({
      ...a, id: a.id ?? uuid(), version: a.version ?? 0, visibility: a.visibility ?? "public", status: a.status ?? "published",
      createdAt: a.createdAt ?? new Date(Date.UTC(2026, 8, 1 + index)).toISOString(),
    }));
    this.categories = [...new Set(this.articles.flatMap((a) => a.categories ?? [a.category]))].map((name) => ({ id: uuid(), slug: name, name }));
    const bySlug = (slug: string) => this.articles.find((a) => a.slug === slug);
    this.series = (options.series ?? initialSeries.map((s) => ({ ...s, articleSlugs: s.articleSlugs.filter((slug) => bySlug(slug)) })))
      .map((s) => ({ ...s, id: s.id.length === 36 ? s.id : uuid(), version: s.version ?? 0 }));
    for (const s of this.series) for (const slug of s.articleSlugs) { const a = bySlug(slug); if (a) a.seriesId = s.id; }
  }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private changed() { this.snapshots.clear(); this.listeners.forEach((l) => l()); }
  private guard(call: string) {
    this.calls.push(call);
    if (this.failNext) { const error = this.failNext; this.failNext = null; throw error; }
  }

  published(): Article[] { return this.articles.filter((a) => a.status === "published" && a.visibility !== "private"); }
  article(slug: string) { return this.articles.find((a) => a.slug === slug); }

  readonly studio: StudioOperations = {
    reload: async () => { this.changed(); },
    uploadImage: async (file) => { this.guard(`upload ${file.name}`); return `/api/v1/media/${uuid()}`; },
    searchCovers: async (resource, query) => {
      this.guard(`search covers ${resource.type} ${query}`);
      return { id: uuid(), state: "done", errorCode: null, candidates: [1, 2].map((n) => ({ candidateId: `p${n}`, thumbnailUrl: `https://images.pexels.com/photos/${n}/thumb.jpeg`, sourceUrl: `https://www.pexels.com/photo/${n}/`, photographer: `Fotoğrafçı ${n}`, photographerUrl: `https://www.pexels.com/@f${n}`, licenseUrl: "https://www.pexels.com/license/", alt: `Sonuç ${n}` })) };
    },
    selectCover: async (jobId, candidateId) => { this.guard(`select cover ${candidateId}`); const assetId = uuid(); return { assetId, url: `/api/v1/media/${assetId}` }; },
    createSeries: async (record) => {
      this.guard("create series");
      if (this.series.some((s) => s.slug === record.slug)) throw new ApiError(409, "SLUG_TAKEN", "Bu seri bağlantısı kullanılıyor");
      const created: BlogSeries = { ...record, id: uuid(), version: 0, status: "draft", articleSlugs: [] };
      this.series = [...this.series, created]; this.changed();
      return created;
    },
    saveSeries: async (record, status) => {
      this.guard(`save series ${record.slug}`);
      const previous = this.series.find((s) => s.id === record.id);
      if (!previous) throw new ApiError(404, "NOT_FOUND", "Bulunamadı");
      if (this.series.some((s) => s.id !== record.id && s.slug === record.slug)) throw new ApiError(409, "SLUG_TAKEN", "Bu seri bağlantısı kullanılıyor");
      let next: BlogSeries = { ...record, status: previous.status, version: (previous.version ?? 0) + 1 };
      for (const action of seriesActions(previous.status, status)) {
        if (action === "publish" && !next.articleSlugs.some((slug) => this.published().some((a) => a.slug === slug))) throw new ApiError(409, "SERIES_EMPTY", "Seriyi yayımlamak için en az bir yayındaki bölüm gerekli");
        next = { ...next, status: action === "publish" ? "published" : action === "archive" ? "archived" : action === "trash" ? "trashed" : "draft" };
      }
      this.articles = this.articles.map((a) => record.articleSlugs.includes(a.slug) ? { ...a, seriesId: record.id } : a.seriesId === record.id ? { ...a, seriesId: null } : a);
      this.series = this.series.map((s) => s.id === record.id ? next : s); this.changed();
      return next;
    },
    saveArticle: async (article, { isNew, seriesId, status, visibility }) => {
      this.guard(`save article ${article.slug}`);
      const previous = isNew ? undefined : this.articles.find((a) => a.id === article.id);
      if (this.articles.some((a) => a.slug === article.slug && a.id !== previous?.id)) throw new ApiError(409, "SLUG_TAKEN", "Bu kalıcı bağlantı kullanılıyor", [], { suggestedSlug: `${article.slug}-2` });
      let current = previous?.status ?? "draft"; let currentVisibility = previous?.visibility ?? visibility;
      for (const step of articleActions(current, currentVisibility, status, visibility)) {
        if ((step === "publish" || step === "schedule") && !article.paragraphs.some((p) => p.trim())) throw new ApiError(422, "VALIDATION_FAILED", "Alanları kontrol et", [{ field: "document.blocks", code: "PARAGRAPH_REQUIRED" }]);
        if ((step === "publish" || step === "schedule") && currentVisibility === "private") throw new ApiError(409, "PRIVATE_NOT_PUBLISHABLE", "Özel yazı yayımlanamaz");
        current = step === "publish" ? "published" : step === "schedule" ? "scheduled" : step === "archive" ? "archived" : step === "trash" ? "trashed" : "draft";
        if (step === "make-private") currentVisibility = "private";
        if (step === "prepare-public") currentVisibility = "public";
      }
      const saved: Article = { ...article, id: previous?.id ?? uuid(), version: (previous?.version ?? -1) + 1, status: current, visibility: currentVisibility, seriesId, createdAt: previous?.createdAt ?? new Date().toISOString(), authored: true };
      this.articles = previous ? this.articles.map((a) => a.id === saved.id ? saved : a) : [saved, ...this.articles];
      this.series = this.series.map((s) => {
        const without = s.articleSlugs.filter((slug) => slug !== (previous?.slug ?? saved.slug) && slug !== saved.slug);
        if (s.id === seriesId) return { ...s, version: (s.version ?? 0) + 1, articleSlugs: insertChapterByCreation(without, saved, this.articles) };
        return without.length === s.articleSlugs.length ? s : { ...s, version: (s.version ?? 0) + 1, articleSlugs: without, status: !without.length && s.status === "published" ? "draft" : s.status };
      });
      this.changed();
      return saved;
    },
  };

  private saveWorkspace = (next: Workspace) => {
    const applying = JSON.stringify(next.applied) !== JSON.stringify(this.workspace.applied);
    if (applying && this.failNext) { this.failNext = null; return Promise.resolve(false); }
    this.calls.push(applying ? "apply theme" : "save draft");
    this.workspace = { version: 1, draft: cloneTheme(next.draft), applied: cloneTheme(next.applied) }; this.changed();
    return applying ? Promise.resolve(true) : true;
  };

  /** Context values for the given surface: Studio (all content + operations) or visitor (published only). */
  values(mode: "studio" | "public") {
    const cached = this.snapshots.get(mode);
    if (cached) return cached;
    const content: ContentState = mode === "studio"
      ? { categories: this.categories, articles: this.articles, series: this.series, ready: true, error: null, studio: this.studio }
      : { categories: this.categories, articles: this.published(), series: this.series.filter((s) => s.status === "published"), ready: true, error: null };
    const workspace: WorkspaceState = { workspace: mode === "studio" ? this.workspace : { version: 1, draft: this.workspace.applied, applied: this.workspace.applied }, save: mode === "studio" ? this.saveWorkspace : () => false, ready: true, storageError: null };
    const snapshot = { content, workspace };
    this.snapshots.set(mode, snapshot);
    return snapshot;
  }
}

function MemoryProvider({ site, mode, children }: { site: MemorySite; mode: "studio" | "public"; children: ReactNode }) {
  const values = useSyncExternalStore(site.subscribe, () => site.values(mode), () => site.values(mode));
  return <SiteDataValues content={values.content} workspace={values.workspace}>{children}</SiteDataValues>;
}

export function renderWithSite(ui: ReactElement, { site = new MemorySite(), mode = "public" as "studio" | "public", ...options }: { site?: MemorySite; mode?: "studio" | "public" } & RenderOptions = {}) {
  const wrapper = ({ children }: { children: ReactNode }) => <MemoryProvider site={site} mode={mode}>{children}</MemoryProvider>;
  return { site, ...render(ui, { wrapper, ...options }) };
}

/** Wrapper for renderHook / custom renders. */
export function siteWrapper(site: MemorySite, mode: "studio" | "public" = "public") {
  return ({ children }: { children: ReactNode }) => <MemoryProvider site={site} mode={mode}>{children}</MemoryProvider>;
}
