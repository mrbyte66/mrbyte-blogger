import { describe, expect, it } from "vitest";
import { initialNavigation, navigate } from "../lib/navigation";
import { articles, filterArticles, findArticle } from "../lib/content";

describe("content navigation", () => {
  it("returns from a chapter to its series, then from the series to the catalog", () => {
    let state = navigate(initialNavigation, { type: "series", slug: "yapay-zeka-ile-yazilim" });
    state = navigate(state, { type: "article", slug: articles[0].slug });
    state = navigate(state, { type: "back" });
    expect(state).toMatchObject({ writingView: "series", seriesSlug: "yapay-zeka-ile-yazilim", articleSlug: null });
    state = navigate(state, { type: "back" });
    expect(state).toMatchObject({ writingView: "series", seriesSlug: null });
  });
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
    expect(filterArticles("Yazılım")).toHaveLength(10);
    expect(filterArticles("Yazılım").every((item) => item.category === "Yazılım")).toBe(true);
    expect(filterArticles("Edebiyat").map((item) => item.slug)).toEqual(["satir-aralarinda"]);
    expect(filterArticles("Kültür").map((item) => item.slug)).toEqual(["merak-bir-aliskanlik"]);
    expect(filterArticles("Tümü")).toHaveLength(12);
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
