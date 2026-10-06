"use client";
import { RecordVisit } from "../reading/RecordVisit";
import { SitePageHeader } from "../SitePageHeader";

import type { Theme } from "../../lib/builder/model";
import { articleStatus } from "../../lib/editorial/store";
import { useArticles } from "../../lib/articles/use-articles";
import type { Article } from "../../lib/content";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { SeriesArticleNav } from "../series/SeriesArticleNav";
import { ReadingTools } from "../reading/ReadingTools";
import { ArticleContent } from "../ArticleContent";
export function ArticlePageView({ article, theme, preview = false }: { article: Article; theme: Theme; preview?: boolean }) {
  const appearance = themeAppearance(theme);
  return <main className={`${appearance.className} reading-page article-width-${article.presentation?.width ?? "comfortable"}`} style={appearance.style}><SitePageHeader theme={theme} preview={preview} /><div id="reading-content" className="reading-content"><SeriesArticleNav serverSeries={article.serverSeries} articleSlug={article.slug} /><ArticleContent article={article} fullPage preview={preview} /></div>{!preview && <RecordVisit articleId={article.serverId} revisionId={article.serverRevisionId}/>}
{!preview && <ReadingTools articleId={article.serverId ?? article.slug} serverRevisionId={article.serverRevisionId} legacySlug={article.slug} serverBlocks={article.serverDocument?.blocks} contentRootId="reading-content" contentRevision={article.serverRevisionId ?? JSON.stringify([article.excerpt, article.paragraphs])} />}</main>;
}
export function ArticlePage({ article: fallback, slug }: { article?: Article; slug?: string }) {
  const { workspace } = useWorkspace();
  const { articles, ready } = useArticles();
  const found = articles.find((item) => item.slug === (slug ?? fallback?.slug));
  const article = ready ? (found && articleStatus(found) === "published" ? found : undefined) : fallback;
  if (!article) return <main className={`${themeAppearance(workspace.applied).className} reading-page`} style={themeAppearance(workspace.applied).style}><SitePageHeader theme={workspace.applied} /><div className="reading-content"><h1>{ready ? "Yazı bulunamadı" : "Yazı yükleniyor…"}</h1>{ready && <p>Bu bağlantıya ait yazı bu tarayıcıda bulunmuyor.</p>}</div></main>;
  return <ArticlePageView article={article} theme={workspace.applied} />;
}
