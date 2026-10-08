// Server-only: used by Server Components, route metadata, sitemap and robots. Never imported by client UI.
import { cache } from "react";
import type { ArticleDetailDto, ArticleSummaryDto, CategoryDto, PublicSiteDto, SeriesSummaryDto } from "./mapping";

/** Fixed internal backend origin (never derived from request headers). */
const backendOrigin = (process.env.BACKEND_INTERNAL_URL ?? "http://127.0.0.1:8080").replace(/\/+$/, "");

export class BackendUnavailable extends Error {}
export type BackendResult<T> = { status: number; data: T | null };

export async function backend<T>(path: string, options: { cookie?: string | null } = {}): Promise<BackendResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${backendOrigin}${path}`, {
      cache: "no-store",
      headers: { Accept: "application/json", ...(options.cookie ? { Cookie: options.cookie } : {}) },
      redirect: "manual",
    });
  } catch {
    throw new BackendUnavailable("Backend unreachable");
  }
  if (response.status >= 500) throw new BackendUnavailable(`Backend ${response.status}`);
  if (!response.ok) return { status: response.status, data: null };
  return { status: response.status, data: await response.json() as T };
}

async function allPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; page < 40; page++) {
    const { data } = await backend<{ items: T[]; totalPages: number }>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&size=50`);
    if (!data) break;
    items.push(...data.items);
    if (page + 1 >= data.totalPages) break;
  }
  return items;
}

export type PublicContent = { site: PublicSiteDto; articles: ArticleSummaryDto[]; series: SeriesSummaryDto[]; categories: CategoryDto[] };

/** Published content for the visitor-facing theme (memoized per request; never shared across requests). */
export const loadPublicContent = cache(async (): Promise<PublicContent> => {
  const [site, articles, series, categories] = await Promise.all([
    backend<PublicSiteDto>("/api/v1/site"),
    allPages<ArticleSummaryDto>("/api/v1/articles?expand=document"),
    allPages<SeriesSummaryDto>("/api/v1/series"),
    backend<{ items: CategoryDto[] }>("/api/v1/categories"),
  ]);
  return { site: site.data ?? { indexingEnabled: false, canonicalOrigin: "" }, articles, series, categories: categories.data?.items ?? [] };
});

export type Resolved<T> = { kind: "found"; value: T } | { kind: "redirect"; path: string } | { kind: "missing" };

export const loadArticle = cache(async (slug: string): Promise<Resolved<ArticleDetailDto>> => resolve<ArticleDetailDto>(`/api/v1/articles/by-slug/${encodeURIComponent(slug)}`));
export const loadSeries = cache(async (slug: string): Promise<Resolved<SeriesSummaryDto & { seo?: { indexable: boolean; description?: string | null }; publicModifiedAt?: string }>> => resolve(`/api/v1/series/by-slug/${encodeURIComponent(slug)}`));

async function resolve<T>(path: string): Promise<Resolved<T>> {
  const { status, data } = await backend<T & { resolution?: string; canonicalPath?: string }>(path);
  if (status === 404 || !data) return { kind: "missing" };
  if (data.resolution === "redirect" && data.canonicalPath) return { kind: "redirect", path: data.canonicalPath };
  return { kind: "found", value: data };
}

export type SessionDto = { authenticated: boolean; profile?: { id: string; role: "owner" | "member"; verified: boolean } };
export async function loadSession(cookie: string | null): Promise<SessionDto> {
  if (!cookie) return { authenticated: false };
  return (await backend<SessionDto>("/api/v1/auth/session", { cookie })).data ?? { authenticated: false };
}

export const siteOrigin = () => (process.env.PUBLIC_SITE_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, "");
