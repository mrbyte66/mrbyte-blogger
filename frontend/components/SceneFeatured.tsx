import type { Article } from "../lib/content";
import type { BlogSeries } from "../lib/series/model";

export function SceneFeatured({ article, series, onArticle, onSeries }: { article?: Article; series?: BlogSeries; onArticle: (slug: string) => void; onSeries: (slug: string) => void }) {
  if (!article && !series) return null;
  return <div className="scene-featured" aria-label="Öne çıkan içerikler">
    {article && <button className="scene-feature-card" data-scene-field="featured-article" data-article={article.slug} onClick={() => onArticle(article.slug)}><span className="scene-feature-copy"><span className="scene-feature-label">DEFTERDEN BİR SAYFA</span><span className="scene-feature-title">{article.title}</span></span><span className="scene-feature-arrow" aria-hidden="true">↗</span></button>}
    {series && <button className="scene-feature-card scene-feature-series" data-scene-field="featured-series" data-series={series.slug} onClick={() => onSeries(series.slug)}><span className="scene-feature-copy"><span className="scene-feature-label">BİR OKUMA YOLU</span><span className="scene-feature-title">{series.title}</span></span><span className="scene-feature-arrow" aria-hidden="true">↗</span></button>}
  </div>;
}
