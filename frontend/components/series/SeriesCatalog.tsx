"use client";

import { SlideLink as Link } from "../SlideLink";
import PlainLink from "next/link";
import { articleBodyPreview, findArticle } from "../../lib/content";
import { publishedSeries, type BlogSeries } from "../../lib/series/model";
import { useProgressiveItems } from "../../lib/use-progressive-items";
import "../../app/series.css";

type Props = {
  series: readonly BlogSeries[];
  selectedSeriesSlug?: string | null;
  onOpenSeries?: (slug: string) => void;
  onOpenArticle?: (slug: string) => void;
  chapterLimit?: number;
  onChapterLimitChange?: (value: number) => void;
};
export function SeriesCatalog({ series, selectedSeriesSlug, onOpenSeries, onOpenArticle, chapterLimit, onChapterLimitChange }: Props) {
  const visible = publishedSeries(series);
  const selected = visible.find((s) => s.slug === selectedSeriesSlug);
  const chapters = useProgressiveItems({ total: selected?.articleSlugs.length ?? 0, listKey: selectedSeriesSlug ?? "", limit: chapterLimit, onLimitChange: onChapterLimitChange });
  function articleAction(slug: string, label: React.ReactNode, className?: string) {
    const open = () => onOpenArticle?.(slug);
    return onOpenArticle ? <button type="button" className={className} data-article={slug} onClick={open}>{label}</button> : <Link className={className} href={`/yazilar/${slug}`} onClick={open}>{label}</Link>;
  }
  if (selectedSeriesSlug && !selected) return <div className="series-empty"><h2 id={onOpenSeries ? "panel-title" : undefined} tabIndex={-1}>Seri henüz yayında değil</h2><p>Bu bağlantının serisi kaldırılmış veya taslak olabilir.</p></div>;
  if (selected) {
    return <section className="series-detail" aria-label={selected.title}>
      <div className="series-meta"><span>{selected.level}</span><span>{selected.articleSlugs.length} bölüm</span><span>{selected.ongoing ? "Yeni bölümler gelecek" : "Tamamlanmış seri"}</span></div>
      {onOpenSeries ? <h2 id="panel-title" tabIndex={-1}>{selected.title}</h2> : <h1>{selected.title}</h1>}<p className="series-summary">{selected.summary}</p>
      <div className="series-start-actions">{articleAction(selected.articleSlugs[0], "İlk bölümden başla", "series-primary")}</div>
      <ol className="series-chapters">{selected.articleSlugs.slice(0, chapters.visible).map((slug, index) => {
        const article = findArticle(slug)!;
        return <li key={slug}>{articleAction(slug, <><span className="series-chapter-number">{String(index + 1).padStart(2, "0")}</span><span className="series-chapter-copy"><strong>{article.title}</strong><span>{articleBodyPreview(article)}</span><small>{article.minutes} dk okuma</small></span><span aria-hidden="true">→</span></>, "series-chapter")}</li>;
      })}</ol>
      <div className="progressive-footer" ref={chapters.sentinel}><span role="status">{chapters.visible} / {selected.articleSlugs.length} bölüm</span>{chapters.hasMore && <button onClick={chapters.loadMore}>Sonraki 5 bölümü göster ↓</button>}</div>
      {onOpenSeries && <Link className="reading-permalink" href={`/seriler/${selected.slug}`}>Serinin kalıcı bağlantısını aç ↗</Link>}
    </section>;
  }
  return <div className="series-catalog">{!visible.length ? <p className="series-empty">Henüz yayınlanmış seri yok. Yeni okuma yolları burada yer alacak.</p> : visible.map((s) => {
    const content = <><span className="series-meta"><span>{s.level}</span><span>{s.articleSlugs.length} bölüm</span></span><strong>{s.title}</strong><span className="series-summary">{s.summary}</span><span className="series-card-footer"><span>{s.ongoing ? "Devam eden seri" : "Tamamlanmış seri"}</span><span>Seriyi keşfet ↗</span></span></>;
    return onOpenSeries ? <button type="button" key={s.id} className="series-card" onClick={() => onOpenSeries(s.slug)}>{content}</button> : <PlainLink key={s.id} className="series-card" href={`/seriler/${s.slug}`}>{content}</PlainLink>;
  })}</div>;
}
