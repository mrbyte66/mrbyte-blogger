import type { Metadata } from "next";
import { PublishedSite } from "../components/builder/ThemeRenderer";
import { canonical, getPublicSite } from "../lib/api/public-server";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSite(); const index=site.indexingEnabled && site.seo.indexable;
  return { title: site.seo.title || site.siteName, description: site.seo.description, alternates: { canonical: canonical(site,"/") }, robots: { index, follow: index } };
}
export default function Home() { return <PublishedSite />; }
