import { describe, expect, it, vi, afterEach } from "vitest";
import { initialContent, publicArticles, publicSeries, saveArticleRecord } from "../lib/editorial/store";
import { validateArticle } from "../lib/articles/model";
import { articles } from "../lib/content";
import { parseSession, sessionDuration } from "../lib/auth/model";
afterEach(() => vi.useRealTimers());
describe("publication scheduling", () => {
  it("stores the absolute publication time while hiding scheduled chapters", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));
    const scheduledAt = "2026-10-06T12:30:00.000Z";
    const next = saveArticleRecord(initialContent, { ...articles[0], status: "scheduled", scheduledAt }, false);
    expect(next.articles[0].scheduledAt).toBe(scheduledAt);
    expect(publicArticles(next.articles).some(a => a.slug === articles[0].slug)).toBe(false);
    expect(publicSeries(next.series, next.articles).every(s => !s.articleSlugs.includes(articles[0].slug))).toBe(true);
    // A browser clock reaching the planned date cannot claim server publication.
    vi.setSystemTime(new Date("2026-10-07T10:00:00.000Z"));
    expect(publicArticles(next.articles).some(a => a.slug === articles[0].slug)).toBe(false);
  });
  it("rejects missing, malformed, past times and writing without content", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-05T10:00:00.000Z"));
    expect(validateArticle({ ...articles[0], status: "scheduled" })).toBeNull();
    expect(validateArticle({ ...articles[0], status: "scheduled", scheduledAt: "bad" })).toBeNull();
    expect(validateArticle({ ...articles[0], status: "scheduled", scheduledAt: "2026-02-30T10:00:00.000Z" })).toBeNull();
    expect(() => saveArticleRecord(initialContent, { ...articles[0], status: "scheduled", scheduledAt: "2026-10-04T10:00:00.000Z" }, false)).toThrow(/gelecekte/);
    expect(() => saveArticleRecord(initialContent, { ...articles[0], paragraphs: [""], status: "scheduled", scheduledAt: "2026-10-06T10:00:00.000Z" }, false)).toThrow(/paragraf/);
  });
  it("clears the old schedule when cancelled or immediately published", () => {
    const scheduledAt = new Date(Date.now() + 86400000).toISOString();
    const next = saveArticleRecord(initialContent, { ...articles[0], status: "scheduled", scheduledAt }, false);
    for (const status of ["draft", "published", "archived", "trashed"] as const) {
      const changed = saveArticleRecord(next, { ...next.articles[0], status }, false);
      expect(changed.articles[0].scheduledAt).toBeUndefined();
      expect(changed.articles[0].status).toBe(status);
    }
  });
  it("keeps the global publication-email preference in compatible sessions", () => {
    const profile = { id: "demo-author", name: "Yazar", email: "author@example.com", role: "member", verified: true, googleConnected: false };
    const session = { version: 1, profile, startedAt: Date.now(), expiresAt: Date.now() + sessionDuration };
    expect(parseSession(JSON.stringify(session))?.profile.publicationEmail ?? true).toBe(true);
    expect(parseSession(JSON.stringify({ ...session, profile: { ...profile, publicationEmail: false } }))?.profile.publicationEmail).toBe(false);
    expect(parseSession(JSON.stringify({ ...session, profile: { ...profile, publicationEmail: "yes" } }))).toBeNull();
  });
});
