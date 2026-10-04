import type { Article } from "../content";

export const legacyArticleDate = "2026-09-30";
export function articleCategories(article: Article): readonly Article["category"][] {
  return article.categories?.length ? article.categories : [article.category];
}
export function isArticleDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function articleDate(article: Article): string { return article.publishedAt ?? legacyArticleDate; }
export function formatArticleDate(article: Article): string {
  return new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${articleDate(article)}T12:00:00Z`));
}
export function localCalendarDate(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function sortArticlesByDate(items: readonly Article[]): Article[] {
  return [...items].sort((a, b) => articleDate(b).localeCompare(articleDate(a)));
}
/** Insert by immutable creation time without disturbing the order of existing chapters. */
export function insertChapterByCreation(slugs: readonly string[], article: Article, articles: readonly Article[]): string[] {
  if (slugs.includes(article.slug)) return [...slugs];
  const created = article.createdAt ?? `${legacyArticleDate}T00:00:00.000Z`;
  const index = slugs.findIndex((slug) => (articles.find((a) => a.slug === slug)?.createdAt ?? `${legacyArticleDate}T00:00:00.000Z`) > created);
  const next = [...slugs];
  next.splice(index < 0 ? next.length : index, 0, article.slug);
  return next;
}
