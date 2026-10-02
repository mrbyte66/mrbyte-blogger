"use client";

import { SlideLink as Link } from "../SlideLink";
import { ThemeToggle } from "../SitePreferences";
import type { Article } from "../../lib/content";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { SeriesArticleNav } from "../series/SeriesArticleNav";
import { ReadingTools } from "../reading/ReadingTools";
import { ArticleContent } from "../ArticleContent";
export function ArticlePage({ article }: { article: Article }) {
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} reading-page`} style={appearance.style}><header className="reading-header"><Link href="/">{workspace.applied.siteName}.</Link><ThemeToggle defaultDark={workspace.applied.surface === "night"} /><Link href="/">← Siteye dön</Link></header><div id="reading-content" className="reading-content"><SeriesArticleNav articleSlug={article.slug} /><ArticleContent article={article} fullPage /></div><ReadingTools articleId={article.slug} contentRootId="reading-content" /></main>;
}
