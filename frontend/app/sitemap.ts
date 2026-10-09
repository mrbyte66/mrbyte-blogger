import type { Schema } from "../lib/api/contract";
import type { MetadataRoute } from "next";
import { backend, siteOrigin } from "../lib/api/server";

export const dynamic = "force-dynamic";

/**
 * Only indexable public URLs from the backend manifest (empty while indexing is disabled).
 * lastModified is the last public change, never a planned or display date.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const entries: MetadataRoute.Sitemap = [];
  for (let page = 0; page < 40; page++) {
    const { data } = await backend<Schema<"SeoUrlPage">>(`/api/v1/seo/urls?page=${page}&size=50`);
    if (!data) break;
    for (const item of data.items) entries.push({ url: `${origin}${item.path}`, ...(item.lastModified ? { lastModified: item.lastModified } : {}) });
    if (page + 1 >= data.totalPages) break;
  }
  if (entries.length) entries.unshift({ url: `${origin}/` });
  return entries;
}
