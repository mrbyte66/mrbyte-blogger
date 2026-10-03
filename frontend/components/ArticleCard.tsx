"use client";

import type { Article } from "../lib/content";
import { articleDraftCover } from "../lib/catalog-covers";
import { CatalogCover } from "./CatalogCover";
import { ClapCount } from "./ClapCount";
import { ViewCount } from "./ViewCount";
import { useVisibleArticleView } from "../lib/reactions/use-views";
import { SaveArticleButton } from "./saved/SaveArticleButton";
import { SlideLink } from "./SlideLink";

export function ArticleCard({ article, onOpen, chapter, excerpt = article.excerpt, preview = false }: { article: Article; onOpen?: (slug: string) => void; chapter?: number; excerpt?: string; preview?: boolean }) {
  const view = useVisibleArticleView(article.slug, !preview);
  const content = <>
    <span className="article-card-visual"><CatalogCover fallback={articleDraftCover(article)} />{chapter !== undefined && <span className="article-chapter-label">{String(chapter).padStart(2, "0")} · Bölüm</span>}</span>
    <span className="article-card-main">
      <span className="article-category">{article.category}</span>
      <span className="article-card-title">{article.title}</span>
      <span className="article-excerpt">{excerpt}</span>
    </span>
  </>;
  return <div ref={view.attach} className="article-card">
    {onOpen ? <button type="button" className="article-card-open" data-article={article.slug} onClick={() => onOpen(article.slug)}>{content}</button> : <SlideLink className="article-card-open" href={`/yazilar/${article.slug}`} data-article={article.slug}>{content}</SlideLink>}
    <div className="article-card-footer"><span>{article.minutes} dk okuma</span><ViewCount slugs={[article.slug]} /><ClapCount slugs={[article.slug]} /><SaveArticleButton slug={article.slug} title={article.title} preview={preview} />{onOpen ? <button type="button" className="article-card-read" aria-label={`Oku: ${article.title}`} onClick={() => onOpen(article.slug)}>Oku ↗</button> : <SlideLink className="article-card-read" href={`/yazilar/${article.slug}`} aria-label={`Oku: ${article.title}`}>Oku ↗</SlideLink>}</div>
  </div>;
}
