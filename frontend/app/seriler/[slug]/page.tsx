import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SeriesPage } from "../../../components/series/SeriesPage";
import { loadPublicContent, loadSeries, siteOrigin } from "../../../lib/api/server";
import { JsonLd } from "../../../components/JsonLd";

type Props = { params: Promise<{ slug: string }> };
const valid = (slug: string) => slug.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!valid(slug)) return {};
  const result = await loadSeries(slug);
  if (result.kind !== "found") return {};
  const series = result.value;
  const { site } = await loadPublicContent();
  const url = `${siteOrigin()}/seriler/${series.slug}`;
  return {
    title: series.title, description: series.summary || undefined, alternates: { canonical: url },
    robots: site.indexingEnabled && series.seo?.indexable !== false ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: "website", url, title: series.title, description: series.summary || undefined },
  };
}

export default async function SeriesRoute({ params }: Props) {
  const { slug } = await params;
  if (!valid(slug)) notFound();
  const result = await loadSeries(slug);
  if (result.kind === "redirect") permanentRedirect(result.path);
  if (result.kind === "missing") notFound();
  const series = result.value;
  return <>
    <JsonLd data={{
      "@context": "https://schema.org", "@type": "CollectionPage", name: series.title, description: series.summary || undefined,
      url: `${siteOrigin()}/seriler/${series.slug}`,
      mainEntity: { "@type": "ItemList", itemListElement: series.chapters.map((chapter, index) => ({ "@type": "ListItem", position: index + 1, url: `${siteOrigin()}/yazilar/${chapter.slug}`, name: chapter.title })) },
    }} />
    <SeriesPage slug={series.slug} />
  </>;
}
