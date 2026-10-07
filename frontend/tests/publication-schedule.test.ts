import { describe, expect, it } from "vitest";
import { publicArticles, publicSeries } from "../lib/editorial/store";
import { validateArticle } from "../lib/articles/model";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";

describe("publication scheduling (visitor side)", () => {
  it("hides scheduled, draft and private writing from visitor lists and series", () => {
    const scheduledAt = "2026-10-06T12:30:00.000Z";
    const list = articles.map((a, i) => i === 0 ? { ...a, status: "scheduled" as const, scheduledAt } : i === 1 ? { ...a, status: "draft" as const } : i === 2 ? { ...a, visibility: "private" as const } : a);
    const visible = publicArticles(list).map((a) => a.slug);
    expect(visible).not.toContain(articles[0].slug);
    expect(visible).not.toContain(articles[1].slug);
    expect(visible).not.toContain(articles[2].slug);
    expect(publicSeries(initialSeries, list).every((s) => !s.articleSlugs.includes(articles[0].slug))).toBe(true);
  });
  it("rejects malformed schedule data in records", () => {
    expect(validateArticle({ ...articles[0], status: "scheduled" })).toBeNull();
    expect(validateArticle({ ...articles[0], status: "scheduled", scheduledAt: "bad" })).toBeNull();
    expect(validateArticle({ ...articles[0], status: "scheduled", scheduledAt: "2026-02-30T10:00:00.000Z" })).toBeNull();
    expect(validateArticle({ ...articles[0], status: "scheduled", scheduledAt: "2026-10-06T12:30:00.000Z" })).not.toBeNull();
  });
});
