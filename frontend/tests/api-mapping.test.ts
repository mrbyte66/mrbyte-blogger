import { describe, expect, it } from "vitest";
import { DEFAULT_SERIES_PRESENTATION, seriesFromPublic, type SeriesSummaryDto } from "../lib/api/mapping";

const base: SeriesSummaryDto = { id: "40000000-0000-4000-8000-000000000001", slug: "seri", title: "Seri", summary: "Özet", ongoing: true, chapterCount: 0 };

describe("public series mapping (#30)", () => {
  it("tolerates a summary without chapters or presentation", () => {
    const series = seriesFromPublic(base);
    expect(series.articleSlugs).toEqual([]);
    expect(series.presentation).toEqual(DEFAULT_SERIES_PRESENTATION);
  });

  it("keeps chapter order and the given presentation", () => {
    const series = seriesFromPublic({ ...base, presentation: { heading: "center", chapterStyle: "rows" },
      chapters: [{ id: "a", slug: "birinci", title: "1" }, { id: "b", slug: "ikinci", title: "2" }] });
    expect(series.articleSlugs).toEqual(["birinci", "ikinci"]);
    expect(series.presentation).toEqual({ heading: "center", chapterStyle: "rows" });
  });
});

// Custom categories must survive both public display and editor round trips.
import { articleFromEdit, articleFromPublic, articleWrite, themeFromDto, themeToDto, type ArticleEditDto } from "../lib/api/mapping";
import { createTheme } from "../lib/builder/model";
import { validateArticle } from "../lib/articles/model";
const category = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", slug: "bilim", name: "Bilim" };
const edit: ArticleEditDto = { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", version: 1, createdAt: "2026-10-08T00:00:00Z", status: "draft", visibility: "public", title: "Yıldızlar", slug: "yildizlar", eyebrow: "", abstract: "", displayDate: "2026-10-08", categoryIds: [category.id], document: { schemaVersion: 1, blocks: [{ id: "p", type: "paragraph", text: "Bir yazı." }] }, presentation: { heading: "left", width: "comfortable", showMeta: true }, seo: { indexable: true }, cover: { mode: "auto" }, seriesPlacement: null, readingMinutes: 1 };
describe("dynamic category identities (#44)", () => {
  it("reads public names from the DTO rather than guessing seed topics", () => {
    expect(articleFromPublic({ ...edit, categories: [category], cover: undefined, abstract: "Özet" }).categories).toEqual(["Bilim"]);
  });
  it("preserves IDs through draft validation and a renamed registry", () => {
    const article = validateArticle(articleFromEdit(edit, [category]));
    expect(article).not.toBeNull();
    expect(articleWrite(article!, null, [], [{ ...category, name: "Astronomi" }]).categoryIds).toEqual([category.id]);
  });
  it("never silently replaces an unknown category with a seeded topic", () => {
    expect(() => articleWrite({ ...articleFromEdit(edit, [category]), categoryIds: undefined }, null, [], [])).toThrow("Kategori bulunamadı");
  });
  it("retains theme filter identity when its name changes", () => {
    const theme = createTheme("scene");
    theme.blocks.push({ id: "feed", kind: "articles", title: "Bilim", category: "Bilim", categoryId: category.id, display: "cards", loading: "all" });
    const dto = themeToDto(theme, () => undefined, () => undefined, [category]);
    const restored = themeFromDto(dto, () => undefined, () => undefined, [{ ...category, name: "Astronomi" }]);
    expect(restored.blocks.find((b) => b.id === "feed")).toMatchObject({ category: "Astronomi", categoryId: category.id });
  });
});
