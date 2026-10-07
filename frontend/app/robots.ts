import type { MetadataRoute } from "next";
import { BackendUnavailable, loadPublicContent, siteOrigin } from "../lib/api/server";

export const dynamic = "force-dynamic";

/**
 * robots.txt is not a privacy mechanism: private screens are protected by authentication and
 * carry noindex, so they are not disallowed here (crawlers must be able to see noindex).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  let indexing = false;
  try { indexing = (await loadPublicContent()).site.indexingEnabled; } catch (error) { if (!(error instanceof BackendUnavailable)) throw error; }
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }],
    ...(indexing ? { sitemap: `${siteOrigin()}/sitemap.xml` } : {}),
  };
}
