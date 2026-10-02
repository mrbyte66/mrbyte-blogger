"use client";

import Link from "next/link";
import type { Article } from "../../lib/content";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { themeAppearance } from "../../lib/builder/appearance";
import { ReadingTools } from "../reading/ReadingTools";
import { ArticleContent } from "../ArticleContent";
export function ArticlePage({ article }: { article: Article }) {
  const { workspace } = useWorkspace();
  const appearance = themeAppearance(workspace.applied);
  return <main className={`${appearance.className} reading-page`} style={appearance.style}><header className="reading-header"><Link href="/">{workspace.applied.siteName}.</Link><Link href="/">← Siteye dön</Link></header><div id="reading-content" className="reading-content"><ArticleContent article={article} fullPage /></div><ReadingTools articleId={article.slug} contentRootId="reading-content" /></main>;
}
