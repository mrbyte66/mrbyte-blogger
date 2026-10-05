import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { articles } from "../lib/content";
import { createArticle, validateArticle } from "../lib/articles/model";
import { articleCategories, insertChapterByCreation, isArticleDate } from "../lib/articles/metadata";
import { publicArticles } from "../lib/editorial/store";
import { ArticleProperties } from "../components/builder/ArticleProperties";

describe("article categories and dates", () => {
  it("migrates legacy metadata deterministically and rejects invalid dates/categories", () => {
    const { categories, createdAt, publishedAt, ...legacy } = articles[0];
    expect(validateArticle(legacy)).toMatchObject({ categories: [legacy.category], createdAt, publishedAt });
    expect(validateArticle({ ...legacy, categories: [] })).toBeNull();
    expect(validateArticle({ ...legacy, categories: ["Tümü"] })).toBeNull();
    expect(validateArticle({ ...legacy, publishedAt: "2026-02-30" })).toBeNull();
    expect(isArticleDate("2024-02-29")).toBe(true);
  });
  it("defaults a new writing to its creation day", () => {
    const now = new Date(2026, 9, 4, 14);
    expect(createArticle(now)).toMatchObject({ publishedAt: "2026-10-04", createdAt: now.toISOString() });
  });
  it("sorts visitor writing by its editable display date", () => {
    const next = articles.map((a, i) => i === 1 ? { ...a, publishedAt: "2027-01-01" } : a);
    expect(publicArticles(next)[0].slug).toBe(articles[1].slug);
  });
  it("inserts an older chapter without rearranging existing manual order", () => {
    const slugs = [articles[2].slug, articles[1].slug];
    expect(insertChapterByCreation(slugs, articles[0], articles)).toEqual([articles[0].slug, ...slugs]);
    expect(insertChapterByCreation(slugs, articles[1], articles)).toEqual(slugs);
  });
  it("offers multiple categories and date editing in Studio", () => {
    let updated = articles[0];
    render(<ArticleProperties article={articles[0]} field="meta" onChange={(a) => { updated = a; }} />);
    fireEvent.click(screen.getByLabelText("Kültür"));
    expect(articleCategories(updated)).toEqual(["Yazılım", "Kültür"]);
    fireEvent.change(screen.getByLabelText("Yazı tarihi"), { target: { value: "2026-10-01" } });
    expect(updated.publishedAt).toBe("2026-10-01");
    expect(screen.getByLabelText("Yazılım").hasAttribute("disabled")).toBe(true);
  });
});
