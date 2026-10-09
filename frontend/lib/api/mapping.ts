import type { Article } from "../content";
import type { BlogSeries } from "../series/model";
import type { PageBlock, Theme } from "../builder/model";
import { categoryIds, categoryNames, type Category } from "./categories";

import type { Schema, Output } from "./contract";
export type BlockDto = Schema<"Block">;
export type DocumentDto = Schema<"Document">;
export type MediaDto = Schema<"MediaPublic">;
export type CategoryDto = Schema<"Category">;
export type PresentationDto = Schema<"ArticlePresentation">;
export type ArticleSummaryDto = Schema<"ArticleSummary">;
export type ArticleDetailDto = Schema<"ArticleDetail">;
export type ArticleEditDto = Schema<"ArticleEdit">;
type SeriesPresentation = Schema<"SeriesPresentation">;
export const DEFAULT_SERIES_PRESENTATION: SeriesPresentation = { heading: "left", chapterStyle: "cards" };
// Older servers may omit the two fields (#30); derive their types without redefining the wire contract.
export type SeriesSummaryDto = Omit<Schema<"SeriesSummary">, "presentation" | "chapters"> & Partial<Pick<Schema<"SeriesSummary">, "presentation" | "chapters">>;
export type SeriesEditDto = Schema<"SeriesEdit">;
export type ThemeBlockDto = Schema<"ThemeBlock">;
export type ThemeDto = Schema<"ThemeDocument">;
export type PublicSiteDto = Schema<"PublicSite">;
export type CoverJobDto = Schema<"CoverJob">;
export type CoverCandidateDto = CoverJobDto["candidates"][number];
export type CoverSelectionDto = Output<"studioSelectCover">;

export const mediaUrl = (assetId: string) => `/api/v1/media/${assetId}`;
const mediaPattern = /^\/api\/v1\/media\/([0-9a-f-]{36})$/;


/** Body blocks → the editor's paragraph/figure/code/table model (render order preserved on save). */
function fromDocument(document: DocumentDto): Pick<Article, "paragraphs" | "figure" | "code" | "table" | "blockIds"> {
  const paragraphs: string[] = []; const ids: string[] = [];
  let figure: Article["figure"]; let code: string | undefined; let table: Article["table"];
  const blockIds: NonNullable<Article["blockIds"]> = { paragraphs: ids };
  for (const block of document.blocks) {
    if (block.type === "paragraph" || block.type === "heading" || block.type === "quote") { paragraphs.push(block.text); ids.push(block.id); }
    else if (block.type === "image" && !figure) {
      const src = block.assetId ? mediaUrl(block.assetId) : block.staticPath ?? "";
      figure = { src, alt: block.alt ?? "", caption: block.caption ?? "", width: block.width ?? 1200, height: block.height ?? 675 }; blockIds.figure = block.id;
    } else if (block.type === "code" && code === undefined) { code = block.text; blockIds.code = block.id; }
    else if (block.type === "table" && !table) { table = { caption: block.caption ?? "", columns: block.columns, rows: block.rows }; blockIds.table = block.id; }
  }
  return { paragraphs: paragraphs.length ? paragraphs : [""], ...(figure ? { figure } : {}), ...(code !== undefined ? { code } : {}), ...(table ? { table } : {}), blockIds };
}

/** Editor model → blocks, in the same order ArticleContent renders them; stable IDs are reused. */
export function toDocument(article: Article): DocumentDto {
  const ids = article.blockIds;
  const blocks: BlockDto[] = [];
  const anchor = Math.min(2, article.paragraphs.length - 1);
  article.paragraphs.forEach((text, index) => {
    blocks.push({ id: ids?.paragraphs[index] ?? crypto.randomUUID(), type: "paragraph", text });
    if (index === 0 && article.figure) {
      const match = mediaPattern.exec(article.figure.src);
      blocks.push({ id: ids?.figure ?? crypto.randomUUID(), type: "image", ...(match ? { assetId: match[1] } : { staticPath: article.figure.src }), alt: article.figure.alt, caption: article.figure.caption, width: article.figure.width, height: article.figure.height });
    }
    if (index === anchor && article.code !== undefined) blocks.push({ id: ids?.code ?? crypto.randomUUID(), type: "code", text: article.code, language: "java" });
    if (index === anchor && article.table) blocks.push({ id: ids?.table ?? crypto.randomUUID(), type: "table", caption: article.table.caption, columns: [...article.table.columns], rows: article.table.rows.map((row) => [...row]) });
  });
  return { schemaVersion: 1, blocks };
}

export function articleFromPublic(dto: ArticleSummaryDto | ArticleDetailDto): Article {
  const categories = dto.categories.map((c) => c.name);
  return {
    id: dto.id, slug: dto.slug, authored: true, status: "published", title: dto.title, category: categories[0] ?? "", categories, categoryIds: dto.categories.map((c) => c.id),
    publishedAt: dto.displayDate, eyebrow: dto.eyebrow ?? "", excerpt: dto.abstract ?? "", minutes: Math.max(1, dto.readingMinutes),
    ...(dto.presentation ? { presentation: dto.presentation } : {}),
    ...(dto.cover ? { coverUrl: dto.cover.url } : {}),
    ...(dto.stats ? { stats: dto.stats } : {}),
    ...("revisionId" in dto && dto.revisionId ? { revisionId: dto.revisionId } : {}),
    ...fromDocument(dto.document ?? { schemaVersion: 1, blocks: [] }),
  };
}

export function articleFromEdit(dto: ArticleEditDto, registry: readonly Category[] = []): Article {
  const categories = categoryNames(dto.categoryIds, registry);
  return {
    id: dto.id, version: dto.version, slug: dto.slug, authored: true, status: dto.status, visibility: dto.visibility,
    title: dto.title || "Adsız yazı", category: categories[0] ?? "", categories, categoryIds: [...dto.categoryIds], createdAt: dto.createdAt, publishedAt: dto.displayDate,
    ...(dto.scheduledAt ? { scheduledAt: new Date(dto.scheduledAt).toISOString() } : {}),
    eyebrow: dto.eyebrow ?? "", excerpt: dto.abstract ?? "", minutes: Math.max(1, dto.readingMinutes), presentation: dto.presentation,
    ...(dto.cover.media ? { coverUrl: dto.cover.media.url } : {}),
    seriesId: dto.seriesPlacement?.seriesId ?? null,
    ...fromDocument(dto.document),
  };
}

/** Request body for create/update. The server derives reading time, previews and canonical URLs. */
export function articleWrite(article: Article, seriesId: string | null, seriesVersions: Schema<"VersionRef">[], registry: readonly Category[] = []): Schema<"ArticleWrite"> {
  const cover = article.coverUrl && mediaPattern.exec(article.coverUrl);
  return {
    title: article.title, slug: article.slug, eyebrow: article.eyebrow, abstract: article.excerpt, displayDate: article.publishedAt,
    categoryIds: article.categoryIds ? [...article.categoryIds] : categoryIds(article.categories ?? [article.category], registry),
    document: toDocument(article), presentation: article.presentation ?? { width: "comfortable", heading: "left", showMeta: true },
    seo: { indexable: true }, cover: cover ? { mode: "manual", assetId: cover[1] } : { mode: "auto" },
    seriesPlacement: seriesId ? { seriesId } : null, seriesVersions,
  };
}

export function seriesFromPublic(dto: SeriesSummaryDto): BlogSeries {
  return { id: dto.id, slug: dto.slug, title: dto.title, summary: dto.summary ?? "", status: "published", ongoing: dto.ongoing, presentation: dto.presentation ?? DEFAULT_SERIES_PRESENTATION, ...(dto.cover ? { coverImage: dto.cover.url } : {}), articleSlugs: (dto.chapters ?? []).map((c) => c.slug) };
}

export function seriesFromEdit(dto: SeriesEditDto, slugOfArticle: (id: string) => string | undefined): BlogSeries {
  return { id: dto.id, version: dto.version, slug: dto.slug, title: dto.title, summary: dto.summary ?? "", status: dto.status, ongoing: dto.ongoing, presentation: dto.presentation, ...(dto.cover.media ? { coverImage: dto.cover.media.url } : {}), articleSlugs: dto.chapterIds.map(slugOfArticle).filter((s): s is string => !!s) };
}

export function seriesWrite(series: BlogSeries, idOfArticle: (slug: string) => string | undefined, articleVersions: Schema<"VersionRef">[]): Schema<"SeriesWrite"> {
  const cover = series.coverImage && mediaPattern.exec(series.coverImage);
  return {
    title: series.title, slug: series.slug, summary: series.summary, ongoing: series.ongoing,
    cover: cover ? { mode: "manual", assetId: cover[1] } : { mode: "auto" },
    presentation: series.presentation ?? DEFAULT_SERIES_PRESENTATION, seo: { indexable: true },
    chapterIds: series.articleSlugs.map(idOfArticle).filter((id): id is string => !!id), articleVersions,
  };
}

/** Theme references travel as UUIDs; the editor keeps slugs/topic names. Unknown references become empty. */
export function themeFromDto(dto: ThemeDto, slugOfArticle: (id: string) => string | undefined, slugOfSeries: (id: string) => string | undefined, registry: readonly Category[] = []): Theme {
  const blocks = dto.blocks.map((block) => {
    if (block.kind === "scene") {
      const { featuredArticleId, featuredSeriesId, ...rest } = block as Record<string, unknown>;
      return { ...rest, featuredArticleSlug: (featuredArticleId && slugOfArticle(featuredArticleId as string)) || "", featuredSeriesSlug: (featuredSeriesId && slugOfSeries(featuredSeriesId as string)) || "" };
    }
    if (block.kind === "articles") {
      const { categoryId, ...rest } = block as Record<string, unknown>;
      return { ...rest, categoryId: categoryId ?? null, category: categoryId ? registry.find((c) => c.id === categoryId)?.name ?? "Kategori bulunamadı" : "Tümü" };
    }
    return { ...block };
  }) as unknown as PageBlock[];
  return { name: dto.name, siteName: dto.siteName, accent: dto.accent, typography: dto.typography, surface: dto.surface, width: dto.width, spacing: dto.spacing, blocks };
}

export function themeToDto(theme: Theme, idOfArticle: (slug: string) => string | undefined, idOfSeries: (slug: string) => string | undefined, registry: readonly Category[] = []): ThemeDto {
  const blocks = theme.blocks.map((block) => {
    if (block.kind === "scene") {
      const { featuredArticleSlug, featuredSeriesSlug, ...rest } = block;
      return { ...rest, featuredArticleId: idOfArticle(featuredArticleSlug) ?? null, featuredSeriesId: idOfSeries(featuredSeriesSlug) ?? null };
    }
    if (block.kind === "articles") {
      const { category, ...rest } = block;
      return { ...rest, categoryId: block.categoryId ?? (category === "Tümü" ? null : categoryIds([category], registry)[0]) };
    }
    return { ...block };
  }) as ThemeBlockDto[];
  return { schemaVersion: 1, name: theme.name, siteName: theme.siteName, accent: theme.accent, typography: theme.typography, surface: theme.surface, width: theme.width, spacing: theme.spacing, blocks };
}
