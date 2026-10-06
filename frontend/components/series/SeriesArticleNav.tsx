"use client";

import { SlideLink as Link } from "../SlideLink";
import { useArticles } from "../../lib/articles/use-articles";
import { publicSeries } from "../../lib/editorial/store";
import { articleSeries } from "../../lib/series/model";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import "../../app/series.css";

type Props = { serverSeries?: import("../../lib/content").Article["serverSeries"]; articleSlug: string; onOpenArticle?: (slug: string) => void; onOpenSeries?: (slug: string) => void };
export function SeriesArticleNav({ serverSeries, articleSlug, onOpenArticle, onOpenSeries }: Props) {
  const { series, ready } = useSeriesWorkspace();
  const { articles } = useArticles();
  const membership = articleSeries(publicSeries(series, articles), articleSlug);
  function chapter(slug: string, label: string) { return onOpenArticle ? <button type="button" onClick={() => onOpenArticle(slug)}>{label}</button> : <Link href={`/yazilar/${slug}`}>{label}</Link>; }
  if(serverSeries) return <nav className="series-article-nav" aria-label="Seri bölümleri"><div className="series-article-heading"><span>{serverSeries.position} / {serverSeries.total}. bölüm</span>{onOpenSeries?<button type="button" onClick={()=>onOpenSeries(serverSeries.slug)}>{serverSeries.title} ↗</button>:<Link href={`/seriler/${serverSeries.slug}`}>{serverSeries.title} ↗</Link>}</div><div className="series-article-actions">{serverSeries.previous && chapter(serverSeries.previous.slug,"← Önceki bölüm")}{serverSeries.next && chapter(serverSeries.next.slug,"Sonraki bölüm →")}</div></nav>;
  if (!ready || !membership) return null;
  const index = membership.articleSlugs.indexOf(articleSlug);
  return <nav className="series-article-nav" aria-label="Seri bölümleri">
    <div className="series-article-heading"><span>{index + 1} / {membership.articleSlugs.length}. bölüm</span>{onOpenSeries ? <button type="button" onClick={() => onOpenSeries(membership.slug)}>{membership.title} ↗</button> : <Link href={`/seriler/${membership.slug}`}>{membership.title} ↗</Link>}</div>
    <div className="series-article-actions">{index > 0 && chapter(membership.articleSlugs[index - 1], "← Önceki bölüm")}{index < membership.articleSlugs.length - 1 && chapter(membership.articleSlugs[index + 1], "Sonraki bölüm →")}</div>
  </nav>;
}
