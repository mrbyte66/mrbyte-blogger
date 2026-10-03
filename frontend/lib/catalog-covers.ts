import type { Article } from "./content";
import type { BlogSeries } from "./series/model";

// Local editorial artwork for the prototype, not online search results.
const covers = {
  orbit: "/assets/covers/orbit.svg",
  code: "/assets/covers/code.svg",
  pages: "/assets/covers/pages.svg",
  arches: "/assets/covers/arches.svg",
} as const;

const articleExamples = new Map([
  ["yapay-zeka-ile-dusunmek", covers.orbit],
  ["problemi-once-tanimlamak", covers.orbit],
  ["kucuk-deneyler-tasarlamak", covers.orbit],
  ["test-edilebilir-kararlar", covers.orbit],
  ["kod-incelemesinde-yapay-zeka", covers.orbit],
]);
const seriesExamples = new Map([
  ["yapay-zeka-ile-yazilim", covers.orbit],
  ["kitaplarin-ardindan", covers.pages],
  ["merak-defteri", covers.arches],
]);

export function articleDraftCover(article: Pick<Article, "slug" | "category">): string {
  return articleExamples.get(article.slug) ?? (article.category === "Edebiyat" ? covers.pages : article.category === "Kültür" ? covers.arches : covers.code);
}

export function seriesDraftCover(series: Pick<BlogSeries, "slug">): string {
  return seriesExamples.get(series.slug) ?? covers.code;
}
