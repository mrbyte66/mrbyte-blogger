import { findArticle } from "../content";

export const SERIES_LEVELS = ["Başlangıç", "Orta", "İleri", "Her seviye"] as const;
export type BlogSeries = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImage?: string;
  presentation?: { heading: "left" | "center"; chapterStyle: "cards" | "rows" };
  level: typeof SERIES_LEVELS[number];
  status: "draft" | "published";
  ongoing: boolean;
  articleSlugs: string[];
};

const originalDemoSeries: BlogSeries = {
  id: "series-ai-development", slug: "yapay-zeka-ile-yazilim", title: "YZ ile düşün, yaz ve geliştir",
  summary: "Yapay zekâ ile düşünmekten, anlaşılır ve bakımı kolay kod yazmaya uzanan örnek bir okuma yolu.",
  level: "Başlangıç", status: "published", ongoing: true,
  articleSlugs: ["yapay-zeka-ile-dusunmek", "iyi-kodun-sessizligi"],
};
export const initialSeries: readonly BlogSeries[] = [
  { ...originalDemoSeries, articleSlugs: [...originalDemoSeries.articleSlugs,
    "problemi-once-tanimlamak", "baglami-kucuk-tutmak", "kucuk-deneyler-tasarlamak",
    "ciktilari-sozlesmeyle-sinirlamak", "test-edilebilir-kararlar", "hata-durumlarini-tasarlamak",
    "kod-incelemesinde-yapay-zeka", "kucuk-projeyi-yayinlamak"],
  },
  { id: "series-reading-notes", slug: "kitaplarin-ardindan", title: "Kitapların ardından",
    summary: "Bir cümlenin açtığı düşünceden yeni bir okuma notuna.", level: "Her seviye",
    status: "published", ongoing: true, articleSlugs: ["satir-aralarinda"] },
  { id: "series-curiosity", slug: "merak-defteri", title: "Merak defteri",
    summary: "Kültür, gündelik hayat ve öğrenmek üzerine kısa duraklar.", level: "Her seviye",
    status: "published", ongoing: true, articleSlugs: ["merak-bir-aliskanlik"] },
];
/** Upgrade only the original untouched demonstration. Never add fixtures to an author's collection. */
export function upgradeDemoSeries(series: BlogSeries[]): BlogSeries[] {
  if (series.length !== 1) return series;
  const current = series[0];
  const untouched = !current.coverImage && !current.presentation && Object.entries(originalDemoSeries).every(([key, value]) => {
    const saved = current[key as keyof BlogSeries];
    return Array.isArray(value) ? Array.isArray(saved) && value.length === saved.length && value.every((slug, i) => slug === saved[i]) : value === saved;
  });
  return untouched ? initialSeries.map((entry) => ({ ...entry, articleSlugs: [...entry.articleSlugs] })) : series;
}
export function createSeries(): BlogSeries {
  return { id: `series-${crypto.randomUUID()}`, slug: "", title: "", summary: "", level: "Başlangıç", status: "draft", ongoing: true, articleSlugs: [] };
}
export function seriesValidationError(value: unknown, articleSlugs?: readonly string[]): string | null {
  if (!Array.isArray(value) || value.length > 100) return "En fazla 100 seri kaydedebilirsin.";
  const ids = new Set<string>(); const slugs = new Set<string>(); const memberships = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") return "Seri verisi okunamadı.";
    const s = item as Partial<BlogSeries>;
    if (typeof s.id !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(s.id) || ids.has(s.id)) return "Her serinin benzersiz bir kimliği olmalı.";
    if (typeof s.slug !== "string" || s.slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.slug) || slugs.has(s.slug)) return "Seri bağlantısı benzersiz olmalı; küçük harf, rakam ve tire kullanabilirsin.";
    if (typeof s.title !== "string" || !s.title.trim() || s.title.length > 160) return "Seriye en fazla 160 karakterlik bir başlık ver.";
    if (typeof s.summary !== "string" || s.summary.length > 1000) return "Seri açıklaması en fazla 1000 karakter olabilir.";
    if (s.presentation && (!["left", "center"].includes(s.presentation.heading) || !["cards", "rows"].includes(s.presentation.chapterStyle))) return "Seri sayfa düzeni geçersiz.";
    if (!isValidSeriesCoverImage(s.coverImage)) return "Kapak görseli için site içi bir yol veya HTTPS bağlantısı kullan.";
    if (!SERIES_LEVELS.includes(s.level as BlogSeries["level"]) || !["draft", "published"].includes(s.status ?? "") || typeof s.ongoing !== "boolean") return "Seri seviyesi ve yayın durumunu seç.";
    if (!Array.isArray(s.articleSlugs) || s.articleSlugs.length > 200 || (s.status === "published" && !s.articleSlugs.length)) return "Yayınlanan seride en az bir bölüm olmalı.";
    for (const slug of s.articleSlugs) {
      if (typeof slug !== "string" || !(articleSlugs ? articleSlugs.includes(slug) : findArticle(slug))) return "Bölümleri mevcut yazılardan seç.";
      if (memberships.has(slug)) return "Bir yazı yalnızca bir seride ve bir kez yer alabilir.";
      memberships.add(slug);
    }
    ids.add(s.id); slugs.add(s.slug);
  }
  return null;
}
export function validateSeries(value: unknown, articleSlugs?: readonly string[]): BlogSeries[] | null {
  if (seriesValidationError(value, articleSlugs)) return null;
  return (value as BlogSeries[]).map(({ id, slug, title, summary, coverImage, presentation, level, status, ongoing, articleSlugs }) => ({ id, slug, title, summary, ...(coverImage === undefined ? {} : { coverImage }), ...(presentation ? { presentation: { ...presentation } } : {}), level, status, ongoing, articleSlugs: [...articleSlugs] }));
}
export function isValidSeriesCoverImage(value: unknown): value is string | undefined {
  if (value === undefined) return true;
  if (typeof value !== "string" || value.length > 500 || /\s/.test(value)) return false;
  if (value === "") return true;
  if (/^\/(?!\/)/.test(value)) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}
export function publishedSeries(series: readonly BlogSeries[]): BlogSeries[] {
  return series.filter((entry) => entry.status === "published" && entry.articleSlugs.length > 0);
}
export function articleSeries(series: readonly BlogSeries[], articleSlug: string): BlogSeries | undefined {
  return publishedSeries(series).find((entry) => entry.articleSlugs.includes(articleSlug));
}
export function slugifySeriesTitle(title: string): string {
  return title.replace(/ı/g, "i").replace(/İ/g, "I").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100).replace(/-+$/g, "");
}
