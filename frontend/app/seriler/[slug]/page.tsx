import type { Metadata } from "next";
import { getSeries, getPublicSite, canonical } from "../../../lib/api/public-server";
import { seriesFromApi, themeFromApi } from "../../../lib/api/content";
import { SeriesPageView } from "../../../components/series/SeriesPage";
type Props = { params: Promise<{ slug: string }> };
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [series, site] = await Promise.all([getSeries((await params).slug), getPublicSite()]);
  const title = series.seo?.title || series.title; const description = series.seo?.description || series.summary;
  const index = site.indexingEnabled && series.seo?.indexable === true;
  return { title: `${title} — ${site.siteName}`, description, alternates: { canonical: canonical(site, `/seriler/${series.slug}`) }, robots: { index, follow: index } };
}
export default async function SeriesRoute({ params }: Props) {
  const [series, site] = await Promise.all([getSeries((await params).slug), getPublicSite()]);
  return <SeriesPageView slug={series.slug} theme={themeFromApi(site)} series={[seriesFromApi(series)]} />;
}
