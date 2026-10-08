"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
export function SiteDataProvider({ site, articles, series, children }: { site: PublicSiteDto; articles: ArticleSummaryDto[]; series: SeriesSummaryDto[]; children: ReactNode }) {
  const content = useMemo<ContentState>(() => ({ articles: articles.map(articleFromPublic), series: series.map(seriesFromPublic), ready: true, error: null }), [articles, series]);
  const workspace = useMemo<WorkspaceState>(() => {
    const ref = lookups(content.articles, content.series);
    const theme = site.theme ? themeFromDto(site.theme, ref.slugOfArticle, ref.slugOfSeries) : createTheme("scene");
    return { workspace: { version: 1, draft: cloneTheme(theme), applied: cloneTheme(theme) }, save: () => false, ready: true, storageError: null };
  }, [site.theme, content]);
  const info = useMemo(() => ({ canonicalOrigin: site.canonicalOrigin, authorPublicName: site.authorPublicName ?? null }), [site.canonicalOrigin, site.authorPublicName]);
  return <SiteInfoContext.Provider value={info}><ContentContext.Provider value={content}><WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider></ContentContext.Provider></SiteInfoContext.Provider>;
}

type ThemeServerState = { version: number; draftRevisionId: string | null };
type ThemeWorkspaceDto = { version: number; draftRevisionId: string | null; appliedRevisionId: string | null; draft: ThemeDto | null; applied: ThemeDto | null };

/** Owner surface: all content and the theme workspace, loaded and changed through the Studio API. */
export function StudioDataProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [series, setSeries] = useState<BlogSeries[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<Workspace>(createWorkspace);
  const [themeError, setThemeError] = useState<string | null>(null);
  const themeServer = useRef<ThemeServerState>({ version: 0, draftRevisionId: null });
  const latest = useRef({ articles, series, workspace });
  latest.current = { articles, series, workspace };
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      const [articleDtos, seriesDtos, theme] = await Promise.all([
        allPages<ArticleEditDto>("/studio/articles"), allPages<SeriesEditDto>("/studio/series"), api<ThemeWorkspaceDto>("GET", "/studio/theme"),
      ]);
      const nextArticles = articleDtos.map(articleFromEdit);
      const nextSeries = seriesDtos.map((dto) => seriesFromEdit(dto, (id) => nextArticles.find((a) => a.id === id)?.slug));
      const ref = lookups(nextArticles, nextSeries);
      const applied = theme.data.applied ? themeFromDto(theme.data.applied, ref.slugOfArticle, ref.slugOfSeries) : createTheme("scene");
      const draft = theme.data.draft ? themeFromDto(theme.data.draft, ref.slugOfArticle, ref.slugOfSeries) : cloneTheme(applied);
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
    const { data } = await api<ThemeWorkspaceDto>("PUT", "/studio/theme/draft", { body: themeToDto(theme, ref.idOfArticle, ref.idOfSeries), ifMatch: themeServer.current.version });
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
        const { data } = await api<ThemeWorkspaceDto>("POST", "/studio/theme/apply", { body: { draftRevisionId: themeServer.current.draftRevisionId }, ifMatch: themeServer.current.version });
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
      const { data } = await api<{ url: string }>("POST", "/studio/media", { form });
      return data.url;
    },
    async searchCovers(resource, query) {
      const { data } = await api<CoverJobDto>("POST", "/studio/cover-jobs", { body: { resourceType: resource.type, resourceId: resource.id, resourceVersion: resource.version ?? null, query } });
      return data;
    },
    async selectCover(jobId, candidateId) {
      const { data } = await api<CoverSelectionDto>("POST", `/studio/cover-jobs/${jobId}/select`, { body: { candidateId } });
      return data;
    },
    async createSeries(record) {
      const ref = lookups(latest.current.articles, latest.current.series);
      const { data } = await api<SeriesEditDto>("POST", "/studio/series", { body: seriesWrite({ ...record, articleSlugs: [] }, ref.idOfArticle, []), idempotent: true });
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
      let { data, etag } = await api<SeriesEditDto>("PUT", `/studio/series/${record.id}`, { body: seriesWrite(record, ref.idOfArticle, versions), ifMatch: previous.version });
      for (const action of seriesActions(data.status, status)) {
        ({ data, etag } = await api<SeriesEditDto>("POST", `/studio/series/${record.id}/actions`, { body: { action }, ifMatch: etag ?? data.version, idempotent: true }));
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
      const body = articleWrite(article, seriesId, seriesVersions);
      let dto: ArticleEditDto; let etag: string | null;
      if (isNew || !previous) {
        ({ data: dto, etag } = await api<ArticleEditDto>("POST", "/studio/articles", { body: { ...body, visibility }, idempotent: true }));
      } else {
        ({ data: dto, etag } = await api<ArticleEditDto>("PUT", `/studio/articles/${previous.id}`, { body, ifMatch: previous.version ?? 0 }));
      }
      for (const step of articleActions(dto.status, dto.visibility, status, visibility)) {
        const payload = step === "schedule" ? { action: step, scheduledAt: article.scheduledAt, timeZone: browserTimeZone() } : { action: step };
        ({ data: dto, etag } = await api<ArticleEditDto>("POST", `/studio/articles/${dto.id}/actions`, { body: payload, ifMatch: etag ?? dto.version, idempotent: true }));
      }
      await reload();
      return articleFromEdit(dto);
    },
  }), [reload]);

  const content = useMemo<ContentState>(() => ({ articles, series, ready, error, studio }), [articles, series, ready, error, studio]);
  const themeState = useMemo<WorkspaceState>(() => ({ workspace, save: saveTheme, ready, storageError: themeError }), [workspace, saveTheme, ready, themeError]);
  return <ContentContext.Provider value={content}><WorkspaceContext.Provider value={themeState}>{children}</WorkspaceContext.Provider></ContentContext.Provider>;
}

/** Lifecycle steps to move from the server state to the editor's chosen state (API contract §7). */
export function articleActions(current: ArticleStatus, currentVisibility: "public" | "private", target: ArticleStatus, visibility: "public" | "private"): string[] {
  const steps: string[] = [];
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

export function seriesActions(current: BlogSeries["status"], target: BlogSeries["status"]): string[] {
  if (current === target) return [];
  if (target === "published") return current === "archived" || current === "trashed" ? ["restore", "publish"] : ["publish"];
  if (target === "draft") return [current === "published" ? "save-draft" : "restore"];
  return [target === "archived" ? "archive" : "trash"];
}
