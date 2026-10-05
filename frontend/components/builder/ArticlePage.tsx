"use client";
import { SitePageHeader } from "../SitePageHeader";

import type { Theme } from "../../lib/builder/model";
import type { Article } from "../../lib/content";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { SeriesArticleNav } from "../series/SeriesArticleNav";
import { ReadingTools } from "../reading/ReadingTools";
import { ArticleContent } from "../ArticleContent";
export function ArticlePageView({ article, theme, preview = false }: { article: Article; theme: Theme; preview?: boolean }) {
  const appearance = themeAppearance(theme);
  return <main className={`${appearance.className} reading-page article-width-${article.presentation?.width ?? "comfortable"}`} style={appearance.style}><SitePageHeader theme={theme} preview={preview} /><div id="reading-content" className="reading-content"><SeriesArticleNav articleSlug={article.slug} /><ArticleContent article={article} fullPage preview={preview} /></div>{!preview && <ReadingTools articleId={article.slug} contentRootId="reading-content" contentRevision={JSON.stringify([article.excerpt, article.paragraphs])} />}</main>;
}
/** Server-rendered permalink: the article comes from the API response; the theme from the applied site. */
export function ArticleRoute({ article }: { article: Article }) {
  const { workspace } = useWorkspace();
  return <ArticlePageView article={article} theme={workspace.applied} />;
}
