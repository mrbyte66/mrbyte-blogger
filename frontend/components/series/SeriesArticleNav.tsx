"use client";

import { SlideLink as Link } from "../SlideLink";
import { articleSeries } from "../../lib/series/model";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import "../../app/series.css";

type Props = { articleSlug: string; onOpenArticle?: (slug: string) => void; onOpenSeries?: (slug: string) => void };
export function SeriesArticleNav({ articleSlug, onOpenArticle, onOpenSeries }: Props) {
  const { series, ready } = useSeriesWorkspace();
  const membership = articleSeries(series, articleSlug);
  if (!ready || !membership) return null;
  const index = membership.articleSlugs.indexOf(articleSlug);
  function chapter(slug: string, label: string) { return onOpenArticle ? <button type="button" onClick={() => onOpenArticle(slug)}>{label}</button> : <Link href={`/yazilar/${slug}`}>{label}</Link>; }
  return <nav className="series-article-nav" aria-label="Seri bölümleri">
    <div className="series-article-heading"><span>{index + 1} / {membership.articleSlugs.length}. bölüm</span>{onOpenSeries ? <button type="button" onClick={() => onOpenSeries(membership.slug)}>{membership.title} ↗</button> : <Link href={`/seriler/${membership.slug}`}>{membership.title} ↗</Link>}</div>
    <div className="series-article-actions">{index > 0 && chapter(membership.articleSlugs[index - 1], "← Önceki bölüm")}{index < membership.articleSlugs.length - 1 && chapter(membership.articleSlugs[index + 1], "Sonraki bölüm →")}</div>
  </nav>;
}
