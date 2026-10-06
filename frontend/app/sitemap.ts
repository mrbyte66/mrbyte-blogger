import type { MetadataRoute } from "next";
import { getPublicSite, canonical } from "../lib/api/public-server";
import { serverApi } from "../lib/api/server";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await getPublicSite(); if(!site.indexingEnabled) return [];
  const urls: MetadataRoute.Sitemap = [];
  for(let page=0; ;page++) {
    const response=await serverApi(`/seo/urls?page=${page}&size=50`); if(!response.ok) throw new Error("Sitemap service unavailable");
    const data=await response.json() as { items: { path: string; lastModified?: string }[]; totalPages: number };
    for(const entry of data.items) { if(!/^\/(?:$|yazilar(?:\/[a-z0-9-]+)?$|seriler(?:\/[a-z0-9-]+)?$|uyelik$)/.test(entry.path)) throw new Error("Invalid sitemap path");urls.push({ url: canonical(site,entry.path), ...(entry.lastModified ? { lastModified: entry.lastModified } : {}) }); }
    if(page+1>=data.totalPages) break;
  }
  return urls;
}
