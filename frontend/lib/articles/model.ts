import { articles as fixtures, topics, type Article } from "../content";
import { isValidSeriesCoverImage } from "../series/model";

export function validateArticle(value: unknown): Article | null {
  if (!value || typeof value !== "object") return null;
  const a = value as Article;
  const text = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
  if (!isArticleSlug(a.slug) || !text(a.title, 160) || !a.title.trim() || !text(a.excerpt, 4000) || !text(a.eyebrow, 200) || !topics.slice(1).includes(a.category) || !Number.isInteger(a.minutes) || a.minutes < 1 || a.minutes > 240) return null;
  if (!Array.isArray(a.paragraphs) || !a.paragraphs.length || a.paragraphs.length > 200 || !a.paragraphs.every((p) => text(p, 20000))) return null;
  if (a.status !== undefined && !["draft", "published", "archived", "trashed"].includes(a.status)) return null;
  if (a.authored !== undefined && typeof a.authored !== "boolean") return null;
  if (a.code !== undefined && !text(a.code, 50000)) return null;
  if (a.figure && (!a.figure.src || !isValidSeriesCoverImage(a.figure.src) || !text(a.figure.alt, 500) || !text(a.figure.caption, 1000) || !Number.isFinite(a.figure.width) || a.figure.width <= 0 || !Number.isFinite(a.figure.height) || a.figure.height <= 0)) return null;
  if (a.table && (!text(a.table.caption, 500) || !Array.isArray(a.table.columns) || !a.table.columns.length || a.table.columns.length > 20 || !a.table.columns.every((c) => text(c, 1000)) || !Array.isArray(a.table.rows) || a.table.rows.length > 200 || !a.table.rows.every((row) => Array.isArray(row) && row.length === a.table!.columns.length && row.every((c) => text(c, 4000))))) return null;
  if (a.presentation && (!["comfortable", "wide"].includes(a.presentation.width) || !["left", "center"].includes(a.presentation.heading) || typeof a.presentation.showMeta !== "boolean")) return null;
  return { slug: a.slug, ...(a.status ? { status: a.status } : {}), ...(a.authored ? { authored: true } : {}), title: a.title, category: a.category, eyebrow: a.eyebrow, excerpt: a.excerpt, minutes: a.minutes, paragraphs: [...a.paragraphs], ...(a.code !== undefined ? { code: a.code } : {}), ...(a.figure ? { figure: { ...a.figure } } : {}), ...(a.table ? { table: { caption: a.table.caption, columns: [...a.table.columns], rows: a.table.rows.map((r) => [...r]) } } : {}), ...(a.presentation ? { presentation: { ...a.presentation } } : {}) };
}
export function parseArticles(raw: string): Article[] | null {
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data) || data.length > 1000) return null;
    const checked = data.map(validateArticle);
    if (fixtures.some((fixture) => !checked.some((a) => a?.slug === fixture.slug)) || checked.some((a) => !a) || new Set(checked.map((a) => a!.slug)).size !== checked.length) return null;
    return checked as Article[];
  } catch { return null; }
}

export function isArticleSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}
export function createArticle(): Article {
  return { slug: `yeni-yazi-${crypto.randomUUID().slice(0, 8)}`, title: "Yeni yazı", authored: true, status: "draft", category: "Yazılım", eyebrow: "YAZILIM", excerpt: "", minutes: 1, paragraphs: [""] };
}
