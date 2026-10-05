import type { Article } from "../content";
import { sortArticlesByDate } from "../articles/metadata";
import type { BlogSeries } from "../series/model";

export type ContentStatus = "scheduled" | "draft" | "published" | "archived" | "trashed";
export const statusLabels: Record<ContentStatus, string> = { scheduled: "Planlandı", draft: "Taslak", published: "Yayında", archived: "Arşiv", trashed: "Çöp kutusu" };
export function articleStatus(article: Article): ContentStatus { return article.status ?? "published"; }
/** Visitor-visible writing: published and not private, newest display date first. */
export function publicArticles(articles: readonly Article[]): Article[] { return sortArticlesByDate(articles.filter((a) => articleStatus(a) === "published" && a.visibility !== "private")); }
/** Published series with only their visitor-visible chapters; series without any are hidden. */
export function publicSeries(series: readonly BlogSeries[], articles: readonly Article[]): BlogSeries[] {
  const visible = new Set(publicArticles(articles).map((a) => a.slug));
  return series.filter((s) => s.status === "published").map((s) => ({ ...s, articleSlugs: s.articleSlugs.filter((slug) => visible.has(slug)) })).filter((s) => s.articleSlugs.length > 0);
}
