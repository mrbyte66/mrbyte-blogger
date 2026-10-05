import { type Article } from "../content";
import { validateArticle } from "../articles/model";
import { validateSeries, type BlogSeries } from "../series/model";
export type StudioTarget = { kind: "home" } | { kind: "article" | "series"; slug: string };
export type DocumentDraft = { kind: "article"; article: Article } | { kind: "series"; series: BlogSeries };
export const documentEvent = "mrbyte:document-preview";
export const navigateEvent = "mrbyte:document-navigate";
export function parseStudioTarget(value: unknown): StudioTarget | null {
  if (!value || typeof value !== "object") return null;
  const t = value as StudioTarget;
  if (t.kind === "home") return { kind: "home" };
  if (!["article", "series"].includes(t.kind) || typeof t.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug) || t.slug.length > 100) return null;
  return { kind: t.kind, slug: t.slug };
}
export function parseDocumentDraft(value: unknown): DocumentDraft | null {
  if (!value || typeof value !== "object") return null;
  const d = value as DocumentDraft;
  if (d.kind === "article") { const article = validateArticle(d.article); return article ? { kind: "article", article } : null; }
  if (d.kind === "series") { const series = validateSeries([d.series], Array.isArray(d.series?.articleSlugs) ? d.series.articleSlugs.filter((slug) => typeof slug === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 100) : []); return series ? { kind: "series", series: series[0] } : null; }
  return null;
}
export function isDocumentField(id: unknown): id is string {
  return typeof id === "string" && (/^(title|excerpt|body|figure|code|table|meta|publication|layout|summary|cover|chapters)$/.test(id) || /^paragraph-\d{1,3}$/.test(id));
}
export function targetFromLink(href: string): StudioTarget | null {
  if (href === "/") return { kind: "home" };
  const match = /^\/(yazilar|seriler)\/([a-z0-9-]+)$/.exec(href);
  return match ? parseStudioTarget({ kind: match[1] === "yazilar" ? "article" : "series", slug: match[2] }) : null;
}
