import type { Article } from "../content";
import type { BlogSeries } from "../series/model";
import type { Theme, PageBlock } from "../builder/model";
export type Attribution = {provider:"pexels";sourceUrl:string;photographer:string;licenseUrl:string};
export type Block = { id: string; type: string; text?: string; level?: number; attribution?: string; language?: string; caption?: string; assetId?: string; alt?: string; columns?: string[]; rows?: string[][] };
export type PublicArticle = { id: string; slug: string; title: string; eyebrow: string; abstract: string; displayDate: string; readingMinutes: number; bodyPreview: string; categories: { id: string; slug: string; name: string }[]; cover: { url: string; attribution?:Attribution|null } | null; stats: { views: number; claps: number; saves: number }; revisionId?: string; document?: { schemaVersion: 1; blocks: Block[] }; presentation?: Article["presentation"]; seo?: { title: string | null; description: string | null; indexable: boolean }; firstPublishedAt?: string; publicModifiedAt?: string; series?: Article["serverSeries"] };
export type PublicSeries = { id: string; slug: string; title: string; summary: string; ongoing: boolean; chapterCount: number; cover: { url: string; attribution?:Attribution|null } | null; stats: { views: number; claps: number; saves: number }; chapters?: { article: PublicArticle; position: number }[]; presentation?: BlogSeries["presentation"]; seo?: { title: string | null; description: string | null; indexable: boolean }; publicModifiedAt?: string };
export type PublicSite = { theme: Theme & { schemaVersion: 1 }; siteName: string; authorPublicName: string; seo: { title: string; description: string; indexable: boolean }; canonicalOrigin: string; indexingEnabled: boolean };
export function articleFromApi(value: PublicArticle): Article {
  return { serverId: value.id, slug: value.slug, authored: true, status: "published", title: value.title, category: (value.categories[0]?.name ?? "Yazılım") as Article["category"], categories: value.categories.map(c => c.name) as Article["categories"], publishedAt: value.displayDate, eyebrow: value.eyebrow, excerpt: value.abstract, minutes: value.readingMinutes, paragraphs: value.document?.blocks.filter(b => b.type === "paragraph").map(b => b.text ?? "") ?? [value.bodyPreview], presentation: value.presentation, serverDocument: value.document, serverRevisionId: value.revisionId, serverCover: value.cover?.url, serverAttribution:value.cover?.attribution, serverStats: value.stats, serverSeries: value.series };
}
export function seriesFromApi(value: PublicSeries): BlogSeries {
  return { id: value.id, slug: value.slug, title: value.title, summary: value.summary, ongoing: value.ongoing, coverImage: value.cover?.url, serverAttribution:value.cover?.attribution, status: "published", articleSlugs: value.chapters?.map(c => c.article.slug) ?? [], presentation: value.presentation, serverPublished: true, chapterCount: value.chapterCount, serverStats: value.stats, serverChapters: value.chapters?.map(c => articleFromApi(c.article)) };
}
export function themeFromApi(value: PublicSite, categories:readonly {id:string;name:string}[]=[]): Theme {
  return { ...value.theme, siteName: value.siteName, blocks: value.theme.blocks.map(block => {
    if(block.kind === "scene") { const scene = block as unknown as { featuredArticle?: { slug: string }; featuredSeries?: { slug: string }; showFeaturedArticle: boolean; showFeaturedSeries: boolean };
      return { ...block, featuredArticleSlug: scene.featuredArticle?.slug ?? "", featuredSeriesSlug: scene.featuredSeries?.slug ?? "", showFeaturedArticle: scene.showFeaturedArticle && !!scene.featuredArticle, showFeaturedSeries: scene.showFeaturedSeries && !!scene.featuredSeries };
    }
    if(block.kind === "articles") return { ...block, category: (block as unknown as {categoryId?:string}).categoryId ? categories.find(category=>category.id===(block as unknown as {categoryId:string}).categoryId)?.name ?? "__unavailable-category__" : "Tümü" } as PageBlock;
    return block;
  }) };
}
