"use client";

import type { Article } from "../lib/content";
import { articleDraftCover } from "../lib/catalog-covers";
import { CatalogCover } from "./CatalogCover";
import { ClapCount } from "./ClapCount";
import { ViewCount } from "./ViewCount";
import { useVisibleArticleView } from "../lib/reactions/use-views";
import { SlideLink } from "./SlideLink";

export function ArticleCard({ article, onOpen, chapter, excerpt = article.excerpt, preview = false }: { article: Article; onOpen?: (slug: string) => void; chapter?: number; excerpt?: string; preview?: boolean }) {
  const view = useVisibleArticleView(article.slug, !preview);
  const content = <>
    <span className="article-card-visual"><CatalogCover fallback={articleDraftCover(article)} />{chapter !== undefined && <span className="article-chapter-label">{String(chapter).padStart(2, "0")} · Bölüm</span>}</span>
    <span className="article-card-main">
      <span className="article-category">{article.category}</span>
      <span className="article-card-title">{article.title}</span>
      <span className="article-excerpt">{excerpt}</span>
      <span className="article-card-footer"><span>{article.minutes} dk okuma</span><ViewCount slugs={[article.slug]} /><ClapCount slugs={[article.slug]} /><span aria-hidden="true">Oku ↗</span></span>
    </span>
  </>;
  return onOpen ? <button ref={view.attach} type="button" className="article-card" data-article={article.slug} onClick={() => onOpen(article.slug)}>{content}</button> : <SlideLink ref={view.attach} className="article-card" href={`/yazilar/${article.slug}`} data-article={article.slug}>{content}</SlideLink>;
}
