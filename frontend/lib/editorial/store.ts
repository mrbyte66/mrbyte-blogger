import { articles as fixtures, type Article } from "../content";
import { insertChapterByCreation, sortArticlesByDate } from "../articles/metadata";
import { parseArticles, validateArticle } from "../articles/model";
import { initialSeries, upgradeDemoSeries, validateSeries, type BlogSeries } from "../series/model";

export const contentKey = "mrbyte:content:v2";
export const articleStorageKey = "mrbyte:articles:v1";
export const seriesKey = "mrbyte-blogger:series:v1";
export const contentEvent = "mrbyte:content-updated";
export type ContentWorkspace = { articles: readonly Article[]; series: readonly BlogSeries[] };
export const initialContent: ContentWorkspace = { articles: fixtures, series: initialSeries };
export type ContentStatus = "draft" | "published" | "archived" | "trashed";
export const statusLabels: Record<ContentStatus, string> = { draft: "Taslak", published: "Yayında", archived: "Arşiv", trashed: "Çöp kutusu" };
export function articleStatus(article: Article): ContentStatus { return article.status ?? "published"; }
export function publicArticles(articles: readonly Article[]): Article[] { return sortArticlesByDate(articles.filter((a) => articleStatus(a) === "published")); }
export function publicSeries(series: readonly BlogSeries[], articles: readonly Article[]): BlogSeries[] {
  const visible = new Set(publicArticles(articles).map((a) => a.slug));
  return series.filter((s) => s.status === "published").map((s) => ({ ...s, articleSlugs: s.articleSlugs.filter((slug) => visible.has(slug)) })).filter((s) => s.articleSlugs.length > 0);
}
export function validateContent(value: ContentWorkspace): ContentWorkspace | null {
  const articles = parseArticles(JSON.stringify(value.articles));
  if (!articles) return null;
  const series = validateSeries(value.series, articles.map((a) => a.slug));
  return series ? { articles, series } : null;
}
export function readContent(): ContentWorkspace {
  const raw = localStorage.getItem(contentKey);
  if (raw) {
    const saved = JSON.parse(raw);
    if (saved.version !== 2) throw new Error("Kayıt sürümü desteklenmiyor.");
    const checked = validateContent(saved);
    if (!checked) throw new Error("Kayıtlı içerikler okunamadı. Mevcut kayıt değiştirilmedi.");
    return checked;
  }
  const articleRaw = localStorage.getItem(articleStorageKey);
  const articles = articleRaw ? parseArticles(articleRaw) : fixtures;
  if (!articles) throw new Error("Kayıtlı yazılar okunamadı. Mevcut kayıt değiştirilmedi.");
  const seriesRaw = localStorage.getItem(seriesKey);
  const parsed = seriesRaw ? validateSeries(JSON.parse(seriesRaw), articles.map((a) => a.slug)) : initialSeries;
  if (!parsed) throw new Error("Kayıtlı seriler okunamadı. Mevcut kayıt değiştirilmedi.");
  const series = seriesRaw ? upgradeDemoSeries(parsed as BlogSeries[]) : parsed;
  if (series !== parsed) { try { localStorage.setItem(seriesKey, JSON.stringify(series)); } catch { /* Read remains available; the next explicit save migrates. */ } }
  return { articles, series };
}
/** The combined record is authoritative: article and membership commit in one write. */
export function writeContent(next: ContentWorkspace, previous: ContentWorkspace): ContentWorkspace {
  const checked = validateContent(next);
  if (!checked) throw new Error("İçerik kaydedilemedi. Alanları ve seri bağlantılarını kontrol et.");
  localStorage.setItem(contentKey, JSON.stringify({ version: 2, ...checked }));
  // Compatibility snapshots are non-authoritative. A failed mirror cannot undo a valid commit.
  try {
    if (JSON.stringify(previous.articles) !== JSON.stringify(checked.articles)) localStorage.setItem(articleStorageKey, JSON.stringify(checked.articles));
    if (JSON.stringify(previous.series) !== JSON.stringify(checked.series)) localStorage.setItem(seriesKey, JSON.stringify(checked.series));
  } catch { /* Readers use contentKey after migration. */ }
  window.dispatchEvent(new Event(contentEvent));
  return checked;
}
export function saveArticleRecord(current: ContentWorkspace, article: Article, creating: boolean, seriesId?: string | null): ContentWorkspace {
  const previous = current.articles.find((a) => a.slug === article.slug);
  const checked = validateArticle(!creating && previous ? { ...article, createdAt: previous.createdAt } : article);
  if (!checked || (articleStatus(checked) === "published" && !checked.paragraphs.some((p) => p.trim()))) throw new Error("Yayınlamak için başlık ve en az bir paragraf gerekli.");
  const exists = current.articles.some((a) => a.slug === checked.slug);
  if (creating && exists) throw new Error("Bu kalıcı bağlantı başka bir yazıya ait. Farklı bir bağlantı seç.");
  if (!creating && !exists) throw new Error("Düzenlenen yazı bulunamadı.");
  if (seriesId && !current.series.some((s) => s.id === seriesId && s.status !== "trashed")) throw new Error("Seçilen seri bulunamadı.");
  const series = seriesId === undefined ? current.series : current.series.map((s) => {
    if (s.id === seriesId) {
      const articleSlugs = insertChapterByCreation(s.articleSlugs, checked, current.articles);
      const status = s.status === "draft" && articleSlugs.length === 1 && articleStatus(checked) === "published" ? "published" as const : s.status;
      return { ...s, articleSlugs, status };
    }
    const articleSlugs = s.articleSlugs.filter((slug) => slug !== checked.slug);
    return { ...s, articleSlugs, status: !articleSlugs.length && s.status === "published" ? "draft" as const : s.status };
  });
  return { articles: creating ? [checked, ...current.articles] : current.articles.map((a) => a.slug === checked.slug ? checked : a), series };
}
