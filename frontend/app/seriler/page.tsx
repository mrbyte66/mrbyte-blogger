import type { Metadata } from "next";
import Link from "next/link";
import { getPublicSite,canonical } from "../../lib/api/public-server";
import { serverApi } from "../../lib/api/server";
import { seriesFromApi,themeFromApi,type PublicSeries } from "../../lib/api/content";
import { SitePageHeader } from "../../components/SitePageHeader";
import { SeriesCatalog } from "../../components/series/SeriesCatalog";
import { themeAppearance } from "../../lib/builder/appearance";
export const dynamic="force-dynamic";
type Props={searchParams:Promise<{page?:string}>};
export async function generateMetadata({searchParams}:Props):Promise<Metadata>{const [site,query]=await Promise.all([getPublicSite(),searchParams]);return {title:`Seriler — ${site.siteName}`,alternates:{canonical:canonical(site,"/seriler"+(query.page?`?page=${query.page}`:""))},robots:{index:site.indexingEnabled,follow:site.indexingEnabled}};}
export default async function Page({searchParams}:Props){const [site,query]=await Promise.all([getPublicSite(),searchParams]);const page=Math.min(1000,Math.max(0,Math.floor(Number(query.page)||0)));const response=await serverApi(`/series?page=${page}&size=20`);if(!response.ok)throw new Error("Seriler yüklenemedi.");const result=await response.json() as {items:PublicSeries[];totalPages:number};const theme=themeFromApi(site),appearance=themeAppearance(theme);return <main className={`${appearance.className} reading-page`} style={appearance.style}><SitePageHeader theme={theme}/><section className="reading-content"><h1>Seriler</h1><SeriesCatalog series={result.items.map(seriesFromApi)}/><nav aria-label="Seri sayfaları">{page>0&&<Link href={`/seriler?page=${page-1}`}>← Önceki sayfa</Link>}{page+1<result.totalPages&&<Link href={`/seriler?page=${page+1}`}>Sonraki sayfa →</Link>}</nav></section></main>;}
