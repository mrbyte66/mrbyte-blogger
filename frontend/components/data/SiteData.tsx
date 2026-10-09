"use client";
import type { Input, Schema, Output } from "../../lib/api/contract";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { categoryNames, type Category, type StudioCategory } from "../../lib/api/categories";
import { announceContentChange } from "./PublicContentRefresh";
import type { Article } from "../../lib/content";
import type { BlogSeries } from "../../lib/series/model";
import { cloneTheme, createTheme, createWorkspace, type Theme, type Workspace } from "../../lib/builder/model";
import { previewEvents } from "../../lib/builder/preview-protocol";
import { parseWorkspace } from "../../lib/builder/model";
import { allPages, api, browserTimeZone, describe, ApiError } from "../../lib/api/http";
import {
  articleFromEdit, articleFromPublic, articleWrite, seriesFromEdit, seriesFromPublic, seriesWrite, themeFromDto, themeToDto,
  type ArticleEditDto, type ArticleSummaryDto, type CoverJobDto, type CoverSelectionDto, type PublicSiteDto, type SeriesEditDto, type SeriesSummaryDto, type ThemeDto,
} from "../../lib/api/mapping";

/** Content visible to the current surface: published content for visitors, everything for the owner in Studio. */
export type ContentState = {
  articles: readonly Article[]; series: readonly BlogSeries[]; ready: boolean; error: string | null;
  categories?: readonly Category[];
  categoryManager?: { create: (name: string) => Promise<StudioCategory>; rename: (category: StudioCategory, name: string) => Promise<StudioCategory>; remove: (category: StudioCategory) => Promise<void>; refresh: () => Promise<void>; items: readonly StudioCategory[] };
  studio?: StudioOperations;
};
export type WorkspaceState = { workspace: Workspace; save: (next: Workspace, requirePersistence?: boolean) => boolean | Promise<boolean>; ready: boolean; storageError: string | null };
export type ArticleStatus = Exclude<Article["status"], undefined>;
export type CoverResource = { type: "article" | "series"; id: string; version?: number };
export type StudioOperations = {
  saveArticle: (article: Article, options: { isNew: boolean; seriesId: string | null; status: ArticleStatus; visibility: "public" | "private" }) => Promise<Article>;
  saveSeries: (series: BlogSeries, status: BlogSeries["status"]) => Promise<BlogSeries>;
  createSeries: (series: BlogSeries) => Promise<BlogSeries>;
  uploadImage: (file: File) => Promise<string>;
  /** Searches licensed cover candidates; only the owner-typed query reaches the provider. */
  searchCovers: (resource: CoverResource, query: string) => Promise<CoverJobDto>;
  /** Stores one candidate as a local media asset; the caller then sets it as the manual cover. */
  selectCover: (jobId: string, candidateId: string) => Promise<CoverSelectionDto>;
  reload: () => Promise<void>;
};

const ContentContext = createContext<ContentState>({ articles: [], series: [], ready: false, error: null });
const WorkspaceContext = createContext<WorkspaceState>({ workspace: createWorkspace(), save: () => false, ready: false, storageError: null });
export const useContent = () => useContext(ContentContext);
export const useThemeWorkspace = () => useContext(WorkspaceContext);
export const useSiteInfo = () => useContext(SiteInfoContext);
const SiteInfoContext = createContext<{ canonicalOrigin: string; authorPublicName: string | null }>({ canonicalOrigin: "", authorPublicName: null });

/** Supplies explicit values (used by tests and isolated previews). */
export function SiteDataValues({ content, workspace, children }: { content: ContentState; workspace: WorkspaceState; children: ReactNode }) {
  return <ContentContext.Provider value={content}><WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider></ContentContext.Provider>;
}

const lookups = (articles: readonly Article[], series: readonly BlogSeries[]) => ({
  slugOfArticle: (id: string) => articles.find((a) => a.id === id)?.slug,
  idOfArticle: (slug: string) => articles.find((a) => a.slug === slug)?.id,
  slugOfSeries: (id: string) => series.find((s) => s.id === id)?.slug,
  idOfSeries: (slug: string) => series.find((s) => s.slug === slug)?.id,
});

/** Visitor surface: server-rendered published content and the applied theme. Read-only. */
export function SiteDataProvider({ site, articles, series, categories: registry, children }: { site: PublicSiteDto; articles: ArticleSummaryDto[]; series: SeriesSummaryDto[]; categories?: Category[]; children: ReactNode }) {
  const content = useMemo<ContentState>(() => ({ articles: articles.map(articleFromPublic), series: series.map(seriesFromPublic), categories: registry ?? [...new Map(articles.flatMap((a) => a.categories).map((c) => [c.id, c])).values()], ready: true, error: null }), [articles, series, registry]);
  const workspace = useMemo<WorkspaceState>(() => {
    const ref = lookups(content.articles, content.series);
    const theme = site.theme ? themeFromDto(site.theme, ref.slugOfArticle, ref.slugOfSeries, content.categories) : createTheme("scene");
    return { workspace: { version: 1, draft: cloneTheme(theme), applied: cloneTheme(theme) }, save: () => false, ready: true, storageError: null };
  }, [site.theme, content]);
  const info = useMemo(() => ({ canonicalOrigin: site.canonicalOrigin ?? "", authorPublicName: site.authorPublicName ?? null }), [site.canonicalOrigin, site.authorPublicName]);
  return <SiteInfoContext.Provider value={info}><ContentContext.Provider value={content}><WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider></ContentContext.Provider></SiteInfoContext.Provider>;
}

type ThemeServerState = { version: number; draftRevisionId: string | null };
type ThemeWorkspaceDto = Schema<"ThemeWorkspace">;

/** Owner surface: all content and the theme workspace, loaded and changed through the Studio API. */
export function StudioDataProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<StudioCategory[]>([]);
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(createWorkspace);
  const [themeError, setThemeError] = useState<string | null>(null);
  const themeServer = useRef<ThemeServerState>({ version: 0, draftRevisionId: null });
  const latest = useRef({ articles, series, workspace, categories });
  latest.current = { articles, series, workspace, categories };
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      const [articleDtos, seriesDtos, theme, categoryResponse] = await Promise.all([
        allPages<ArticleEditDto>("/studio/articles"), allPages<SeriesEditDto>("/studio/series"), api<ThemeWorkspaceDto>("GET", "/studio/theme"), api<Output<"studioListCategories">>("GET", "/studio/categories"),
      ]);
      const registry = categoryResponse.data.items;
      const nextArticles = articleDtos.map((dto) => articleFromEdit(dto, registry));
      setCategories(registry);
      const nextSeries = seriesDtos.map((dto) => seriesFromEdit(dto, (id) => nextArticles.find((a) => a.id === id)?.slug));
      const ref = lookups(nextArticles, nextSeries);
      const applied = theme.data.applied ? themeFromDto(theme.data.applied, ref.slugOfArticle, ref.slugOfSeries, registry) : createTheme("scene");
      const draft = theme.data.draft ? themeFromDto(theme.data.draft, ref.slugOfArticle, ref.slugOfSeries, registry) : cloneTheme(applied);
      themeServer.current = { version: theme.data.version, draftRevisionId: theme.data.draftRevisionId };
      setArticles(nextArticles); setSeries(nextSeries); setWorkspace({ version: 1, draft, applied }); setError(null);
    } catch (cause) {
      setError(describe(cause));
    } finally { setReady(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);

  // ------------------------------------------------------------ theme
  const putDraft = useCallback(async (theme: Theme) => {
    const ref = lookups(latest.current.articles, latest.current.series);
    const { data } = await api<ThemeWorkspaceDto>("PUT", "/studio/theme/draft", { body: (themeToDto(theme, ref.idOfArticle, ref.idOfSeries, latest.current.categories) satisfies Input<"studioSaveThemeDraft">), ifMatch: themeServer.current.version });
    themeServer.current = { version: data.version, draftRevisionId: data.draftRevisionId };
  }, []);
  const enqueue = useCallback(<T,>(task: () => Promise<T>) => {
    const run = queue.current.catch(() => undefined).then(task);
    queue.current = run;
    return run;
  }, []);
  const saveTheme = useCallback((next: Workspace) => {
    const current = latest.current.workspace;
    setWorkspace(next);
    const applying = JSON.stringify(next.applied) !== JSON.stringify(current.applied);
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (applying) {
      return enqueue(async () => {
        await putDraft(next.draft);
        if (!themeServer.current.draftRevisionId) throw new ApiError(409, "DRAFT_NOT_FOUND", "Tema taslağı bulunamadı.");
        const { data } = await api<ThemeWorkspaceDto>("POST", "/studio/theme/apply", { body: ({ draftRevisionId: themeServer.current.draftRevisionId } satisfies Input<"studioApplyTheme">), ifMatch: themeServer.current.version });
        themeServer.current = { version: data.version, draftRevisionId: data.draftRevisionId };
        setThemeError(null);
        return true;
      }).catch(async (cause) => {
        setThemeError(`Tema uygulanamadı. ${describe(cause)}`);
        if (cause instanceof ApiError && cause.status === 412) await reload();
        else setWorkspace((w) => ({ ...w, applied: current.applied }));
        return false;
      });
    }
    // Drafts autosave shortly after the last edit; saves run strictly in order.
    timer.current = setTimeout(() => {
      timer.current = null;
      void enqueue(() => putDraft(latest.current.workspace.draft)).then(() => setThemeError(null)).catch(async (cause) => {
        setThemeError(`Taslak kaydedilemedi. ${describe(cause)}`);
        if (cause instanceof ApiError && cause.status === 412) await reload();
      });
    }, 700);
    return true;
  }, [enqueue, putDraft, reload]);

  // Full-page draft preview receives the editor's unsaved workspace from its parent frame.
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== previewEvents.workspace || typeof event.data.workspace !== "string") return;
      const preview = parseWorkspace(event.data.workspace);
      if (preview) setWorkspace(preview);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);

  // ------------------------------------------------------------ content
  const studio = useMemo<StudioOperations>(() => ({
    reload,
    async uploadImage(file) {
      const form = new FormData(); form.append("file", file);
      const { data } = await api<Output<"studioUploadMedia", 202>>("POST", "/studio/media", { form });
      if (!data.url) throw new ApiError(409, "MEDIA_NOT_READY", "Görsel henüz hazır değil.");
      return data.url;
    },
    async searchCovers(resource, query) {
      const { data } = await api<CoverJobDto>("POST", "/studio/cover-jobs", { body: ({ resourceType: resource.type, resourceId: resource.id, resourceVersion: resource.version ?? null, query } satisfies Input<"studioSearchCovers">) });
      return data;
    },
    async selectCover(jobId, candidateId) {
      const { data } = await api<CoverSelectionDto>("POST", `/studio/cover-jobs/${jobId}/select`, { body: ({ candidateId } satisfies Input<"studioSelectCover">) });
      return data;
    },
    async createSeries(record) {
      const ref = lookups(latest.current.articles, latest.current.series);
      const { data } = await api<SeriesEditDto>("POST", "/studio/series", { body: (seriesWrite({ ...record, articleSlugs: [] }, ref.idOfArticle, []) satisfies Input<"studioCreateSeries">), idempotent: true });
      const created = seriesFromEdit(data, ref.slugOfArticle);
      setSeries((list) => [...list, created]);
      return created;
    },
    async saveSeries(record, status) {
      const { articles: list, series: all } = latest.current;
      const ref = lookups(list, all);
      const previous = all.find((s) => s.id === record.id);
      if (!previous?.version && previous?.version !== 0) throw new ApiError(404, "NOT_FOUND", "Seri bulunamadı.");
      const changed = new Set([...previous.articleSlugs.filter((s) => !record.articleSlugs.includes(s)), ...record.articleSlugs.filter((s) => !previous.articleSlugs.includes(s))]);
      const versions = [...changed].map((slug) => list.find((a) => a.slug === slug)).filter((a): a is Article => !!a?.id).map((a) => ({ id: a.id!, version: a.version ?? 0 }));
      let { data, etag } = await api<SeriesEditDto>("PUT", `/studio/series/${record.id}`, { body: (seriesWrite(record, ref.idOfArticle, versions) satisfies Input<"studioUpdateSeries">), ifMatch: previous.version });
      for (const action of seriesActions(data.status, status)) {
        ({ data, etag } = await api<SeriesEditDto>("POST", `/studio/series/${record.id}/actions`, { body: ({ action } satisfies Input<"studioSeriesAction">), ifMatch: etag ?? data.version, idempotent: true }));
      }
      await reload();
      return seriesFromEdit(data, ref.slugOfArticle);
    },
    async saveArticle(article, { isNew, seriesId, status, visibility }) {
      const { articles: list, series: all } = latest.current;
      const previous = isNew ? undefined : list.find((a) => a.id && a.id === article.id);
      const oldSeriesId = previous?.seriesId ?? null;
      const seriesVersions = oldSeriesId === seriesId ? [] : [oldSeriesId, seriesId].filter((id): id is string => !!id)
        .map((id) => ({ id, version: all.find((s) => s.id === id)?.version ?? 0 }));
      const body = articleWrite(article, seriesId, seriesVersions, latest.current.categories);
      let dto: ArticleEditDto; let etag: string | null;
      if (isNew || !previous) {
        ({ data: dto, etag } = await api<ArticleEditDto>("POST", "/studio/articles", { body: ({ ...body, visibility } satisfies Input<"studioCreateArticle">), idempotent: true }));
      } else {
        ({ data: dto, etag } = await api<ArticleEditDto>("PUT", `/studio/articles/${previous.id}`, { body: (body satisfies Input<"studioUpdateArticle">), ifMatch: previous.version ?? 0 }));
      }
      for (const step of articleActions(dto.status, dto.visibility, status, visibility)) {
        const payload = step === "schedule" ? { action: step, scheduledAt: article.scheduledAt, timeZone: browserTimeZone() } : { action: step };
        ({ data: dto, etag } = await api<ArticleEditDto>("POST", `/studio/articles/${dto.id}/actions`, { body: (payload satisfies Input<"studioArticleAction">), ifMatch: etag ?? dto.version, idempotent: true }));
      }
      await reload();
      return articleFromEdit(dto, latest.current.categories);
    },
  }), [reload]);

  const refreshCategories = useCallback(async () => {
    const { data } = await api<Output<"studioListCategories">>("GET", "/studio/categories");
    latest.current.categories = data.items;
    setCategories(data.items);
    setArticles((list) => list.map((a) => a.categoryIds ? { ...a, categories: categoryNames(a.categoryIds, data.items), category: categoryNames(a.categoryIds, data.items)[0] ?? "" } : a));
  }, []);
  const categoryManager = useMemo(() => ({ items: categories, refresh: refreshCategories,
    async create(name: string) {
      const { data } = await api<StudioCategory>("POST", "/studio/categories", { body: ({ name } satisfies Input<"studioCreateCategory">) });
      // Apply the returned identity immediately, even if a later refresh fails.
      setCategories((list) => [...list, data]); latest.current.categories = [...latest.current.categories, data];
      announceContentChange(); return data;
    },
    async rename(category: StudioCategory, name: string) {
      const { data } = await api<StudioCategory>("PATCH", `/studio/categories/${category.id}`, { body: ({ name } satisfies Input<"studioUpdateCategory">), ifMatch: category.version });
      const registry = latest.current.categories.map((c) => c.id === data.id ? data : c);
      latest.current.categories = registry; setCategories(registry);
      setArticles((list) => list.map((a) => a.categoryIds ? { ...a, categories: categoryNames(a.categoryIds, registry), category: categoryNames(a.categoryIds, registry)[0] ?? "" } : a));
      announceContentChange(); return data;
    },
    async remove(category: StudioCategory) {
      await api("DELETE", `/studio/categories/${category.id}`, { ifMatch: category.version });
      const registry = latest.current.categories.filter((c) => c.id !== category.id);
      latest.current.categories = registry; setCategories(registry); announceContentChange();
    },
  }), [categories, refreshCategories]);
  const content = useMemo<ContentState>(() => ({ articles, series, categories, categoryManager, ready, error, studio }), [articles, series, categories, categoryManager, ready, error, studio]);
  const themeState = useMemo<WorkspaceState>(() => ({ workspace, save: saveTheme, ready, storageError: themeError }), [workspace, saveTheme, ready, themeError]);
  return <ContentContext.Provider value={content}><WorkspaceContext.Provider value={themeState}>{children}</WorkspaceContext.Provider></ContentContext.Provider>;
}

/** Lifecycle steps to move from the server state to the editor's chosen state (API contract §7). */
export function articleActions(current: ArticleStatus, currentVisibility: "public" | "private", target: ArticleStatus, visibility: "public" | "private"): Input<"studioArticleAction">["action"][] {
  const steps: Input<"studioArticleAction">["action"][] = [];
  let status = current;
  if (visibility === "private" && currentVisibility === "public") { if (status === "trashed") { steps.push("restore"); } steps.push("make-private"); status = "draft"; }
  if (visibility === "public" && currentVisibility === "private") {
    if (status === "archived" || status === "trashed") { steps.push("restore"); status = "draft"; }
    steps.push("prepare-public");
  }
  if (status === target) return steps;
  if ((status === "archived" || status === "trashed") && target !== "archived" && target !== "trashed") { steps.push("restore"); status = "draft"; }
  if (status === target) return steps;
  switch (target) {
    case "published": steps.push("publish"); break;
    case "scheduled": if (status === "published") steps.push("save-draft"); steps.push("schedule"); break;
    case "draft": steps.push(status === "scheduled" ? "cancel-schedule" : "save-draft"); break;
    case "archived": steps.push("archive"); break;
    case "trashed": steps.push("trash"); break;
  }
  return steps;
}

export function seriesActions(current: BlogSeries["status"], target: BlogSeries["status"]): Input<"studioSeriesAction">["action"][] {
  if (current === target) return [];
  if (target === "published") return current === "archived" || current === "trashed" ? ["restore", "publish"] : ["publish"];
  if (target === "draft") return [current === "published" ? "save-draft" : "restore"];
  return [target === "archived" ? "archive" : "trash"];
}
