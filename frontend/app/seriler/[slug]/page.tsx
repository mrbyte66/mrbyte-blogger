import type { Metadata } from "next";
import { SeriesPage } from "../../../components/series/SeriesPage";
import { initialSeries } from "../../../lib/series/model";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const fixture = initialSeries.find((s) => s.slug === slug);
  return { title: `${fixture?.title ?? "Blog serisi"} — SATIR.`, description: fixture?.summary ?? "Bölüm bölüm takip edebileceğin blog serileri." };
}
export default async function SeriesRoute({ params }: Props) { return <SeriesPage slug={(await params).slug} />; }
