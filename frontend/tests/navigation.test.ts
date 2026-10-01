import { describe, expect, it } from "vitest";
import { initialNavigation, navigate } from "../lib/navigation";
import { articles, filterArticles, findArticle } from "../lib/content";

describe("content navigation", () => {
  it("preserves the selected category when returning from an article", () => {
    let state = navigate(initialNavigation, { type: "open", section: "writing" });
    state = navigate(state, { type: "filter", topic: "Yazılım" });
    state = navigate(state, { type: "article", slug: articles[0].slug });
    expect(state.section).toBe("writing");
    state = navigate(state, { type: "back" });
    expect(state).toEqual({ section: "writing", articleSlug: null, topic: "Yazılım" });
  });
  it("rejects unknown article IDs instead of opening a broken reader", () => {
    expect(navigate(initialNavigation, { type: "article", slug: "missing" })).toBe(initialNavigation);
  });
  it("clears the reader on closing or switching sections", () => {
    const reading = navigate(initialNavigation, { type: "article", slug: articles[0].slug });
    expect(navigate(reading, { type: "close" })).toMatchObject({ section: null, articleSlug: null });
    expect(navigate(reading, { type: "open", section: "projects" })).toMatchObject({ section: "projects", articleSlug: null });
  });
});

describe("content contract", () => {
  it("filters software separately from literature and culture", () => {
    expect(filterArticles("Yazılım").map((item) => item.slug)).toEqual(["yapay-zeka-ile-dusunmek", "iyi-kodun-sessizligi"]);
    expect(filterArticles("Edebiyat").map((item) => item.slug)).toEqual(["satir-aralarinda"]);
    expect(filterArticles("Tümü")).toHaveLength(4);
  });
  it("gives every article a unique ASCII slug and a working lookup", () => {
    expect(new Set(articles.map((item) => item.slug)).size).toBe(articles.length);
    for (const article of articles) {
      expect(article.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(findArticle(article.slug)).toBe(article);
    }
    expect(findArticle("unknown")).toBeUndefined();
  });
});
