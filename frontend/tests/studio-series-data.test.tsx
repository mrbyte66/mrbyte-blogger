import { act, render, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { StudioDataProvider, useContent, type StudioOperations } from "../components/data/SiteData";

afterEach(() => { vi.unstubAllGlobals(); });

const ARTICLE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SERIES = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ETag: `"${(body as { version?: number }).version ?? 0}"` } }));
const series = (version: number, chapterIds: string[]) => ({ id: SERIES, version, status: "draft", title: "Mevsim", slug: "mevsim", summary: "", ongoing: true, cover: { mode: "auto", assetId: null, media: null }, presentation: { heading: "left", chapterStyle: "cards" }, seo: { indexable: true }, chapterIds });

/** Creating a series and saving its chapters right away (one Save in Studio) must not lose the new series. */
it("saves chapters of a series created in the same step", async () => {
  const calls: string[] = [];
  let created = false;
  vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input), "http://localhost"); const method = (init.method ?? "GET").toUpperCase();
    const path = url.pathname.replace(/^\/api\/v1/, ""); calls.push(`${method} ${path}`);
    if (path === "/auth/csrf") return json({ token: "t", headerName: "X-CSRF-TOKEN" });
    if (path === "/studio/articles") return json({ items: [{ id: ARTICLE, version: 3, createdAt: "2026-10-01T00:00:00Z", status: "published", visibility: "public", title: "Bölüm", slug: "bolum", eyebrow: "", abstract: "", displayDate: "2026-10-01", categoryIds: [], document: { schemaVersion: 1, blocks: [] }, presentation: { width: "comfortable", heading: "left", showMeta: true }, seo: { indexable: true }, cover: { mode: "auto", media: null }, seriesPlacement: null, readingMinutes: 1 }], totalPages: 1 });
    if (path === "/studio/series") {
      if (method === "POST") { created = true; return json(series(0, []), 201); }
      return json({ items: created ? [series(1, [ARTICLE])] : [], totalPages: 1 });
    }
    if (path === `/studio/series/${SERIES}` && method === "PUT") return json(series(1, [ARTICLE]));
    if (path === "/studio/theme") return json({ version: 0, draftRevisionId: null, appliedRevisionId: null, draft: null, applied: null });
    if (path === "/studio/categories") return json({ items: [] });
    return json({ title: "unexpected" }, 500);
  }));
  let studio: StudioOperations | undefined; let ready = false;
  function Probe() { const content = useContent(); studio = content.studio; ready = content.ready; return null; }
  render(<StudioDataProvider><Probe /></StudioDataProvider>);
  await waitFor(() => expect(ready).toBe(true));
  await act(async () => {
    const draft = await studio!.createSeries({ id: "local", slug: "mevsim", title: "Mevsim", summary: "", status: "draft", ongoing: true, articleSlugs: [] });
    const saved = await studio!.saveSeries({ ...draft, articleSlugs: ["bolum"] }, "draft");
    expect(saved.articleSlugs).toEqual(["bolum"]);
  });
  expect(calls.filter((c) => c === "POST /studio/series")).toHaveLength(1);
  expect(calls).toContain(`PUT /studio/series/${SERIES}`);
});
