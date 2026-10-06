import "server-only";
import { cache } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { serverApi } from "./server";
import type { PublicArticle, PublicSeries, PublicSite } from "./content";
async function read<T>(path: string): Promise<T> {
  const response = await serverApi(path);
  if(response.status === 404) notFound();
  if(!response.ok) throw new Error("Public content service unavailable");
  return response.json() as Promise<T>;
}
export const getPublicSite = cache(() => read<PublicSite>("/site"));
export const getArticle = cache(async (slug: string) => {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) notFound();
  const data = await read<PublicArticle | { resolution: "redirect"; canonicalPath: string }>(`/articles/by-slug/${encodeURIComponent(slug)}`);
  if("resolution" in data) { if(!/^\/yazilar\/[a-z0-9-]+$/.test(data.canonicalPath)) throw new Error("Invalid canonical path"); permanentRedirect(data.canonicalPath); }
  return data;
});
export const getSeries = cache(async (slug: string) => {
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) notFound();
  const data = await read<PublicSeries | { resolution: "redirect"; canonicalPath: string }>(`/series/by-slug/${encodeURIComponent(slug)}`);
  if("resolution" in data) { if(!/^\/seriler\/[a-z0-9-]+$/.test(data.canonicalPath)) throw new Error("Invalid canonical path"); permanentRedirect(data.canonicalPath); }
  const chapters: { article: PublicArticle; position: number }[] = [];
  for(let page=0;page<4;page++) {
    const result = await read<{ items: (PublicArticle & { chapterNumber: number })[]; totalPages: number }>(`/series/${data.id}/chapters?page=${page}&size=50`);
    chapters.push(...result.items.map(article => ({ article, position: article.chapterNumber })));
    if(page+1>=result.totalPages) break;
  }
  return { ...data, chapters, chapterCount: chapters.length };
});
export const getCatalogs = cache(async () => {
  const [articles, series, categories] = await Promise.all([read<{ items: PublicArticle[]; totalElements: number }>("/articles?size=50&sort=date_desc"), read<{ items: PublicSeries[]; totalElements: number }>("/series?size=50"), read<{items:{id:string;name:string}[]}>("/categories")]);
  return { articles, series, categories };
});
export function canonical(site: PublicSite, path: string) { return new URL(path, site.canonicalOrigin).toString(); }
