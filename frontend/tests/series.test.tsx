import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { articleSeries, initialSeries, publishedSeries, upgradeDemoSeries, seriesValidationError, slugifySeriesTitle, validateSeries } from "../lib/series/model";
import { seriesKey, useSeriesWorkspace } from "../lib/series/use-series-workspace";
import { SeriesArticleNav } from "../components/series/SeriesArticleNav";
import { articleBodyPreview, articles } from "../lib/content";
import { SeriesCatalog } from "../components/series/SeriesCatalog";
vi.mock("../components/SlideLink", () => ({ SlideLink: ({ children, ...props }: React.ComponentProps<"a">) => <a {...props}>{children}</a> }));
beforeEach(() => { localStorage.clear(); });
const fixture = () => initialSeries.map((s) => ({ ...s, articleSlugs: [...s.articleSlugs] }));

describe("series publishing and ordered membership", () => {
  it("rejects duplicate series links, duplicate chapters and unknown articles", () => {
    const saved = fixture();
    expect(validateSeries(saved)).toEqual(saved);
    expect(validateSeries([...saved, { ...saved[0], id: "another" }])).toBeNull();
    expect(validateSeries([{ ...saved[0], articleSlugs: [saved[0].articleSlugs[0], saved[0].articleSlugs[0]] }])).toBeNull();
    expect(validateSeries([{ ...saved[0], articleSlugs: ["missing"] }])).toBeNull();
    expect(seriesValidationError([{ ...saved[0], articleSlugs: [] }])).toContain("en az bir bölüm");
    expect(validateSeries([{ ...saved[0], status: "draft", articleSlugs: [] }])).not.toBeNull();
  });
  it("keeps draft series private and chapter order stable", () => {
    const saved = fixture();
    expect(publishedSeries([{ ...saved[0], status: "draft" }])).toEqual([]);
    expect(articleSeries(saved, "iyi-kodun-sessizligi")?.articleSlugs).toEqual(initialSeries[0].articleSlugs);
    expect(slugifySeriesTitle("İleri Şık Çözümler: Yapay Zekâ ve Işık")).toBe("ileri-sik-cozumler-yapay-zeka-ve-isik");
  });
  it("synchronizes Studio saves immediately across mounted readers without accepting invalid saves", () => {
    const studio = renderHook(useSeriesWorkspace); const reader = renderHook(useSeriesWorkspace);
    const next = [{ ...fixture()[0], title: "Benim serim" }];
    act(() => { expect(studio.result.current.save(next)).toBe(true); });
    expect(reader.result.current.series[0].title).toBe("Benim serim");
    act(() => { expect(studio.result.current.save([{ ...next[0], slug: "İzin verilmez" }])).toBe(false); });
    expect(JSON.parse(localStorage.getItem(seriesKey)!)[0].title).toBe("Benim serim");
    expect(studio.result.current.error).toContain("bağlantısı");
  });
  it("does not report failed persistent writes as success", () => {
    const workspace = renderHook(useSeriesWorkspace);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    act(() => { expect(workspace.result.current.save([{ ...fixture()[0], title: "Unsaved" }])).toBe(false); });
    expect(workspace.result.current.series).toEqual(initialSeries);
    expect(workspace.result.current.error).toContain("kaydedilemedi");
    spy.mockRestore();
  });
});
describe("example content and migration", () => {
  it("extends body previews to a complete sentence after 200 characters, not the abstract", () => {
    const article = articles[0];
    const body = article.paragraphs.join(" ").replace(/\s+/g, " ").trim();
    const preview = articleBodyPreview(article);
    expect(body.length).toBeGreaterThan(200);
    expect(preview.length).toBeGreaterThan(200);
    expect(preview).toMatch(/[.!?…]$/);
    expect(preview).not.toBe(article.excerpt);

    render(<SeriesCatalog series={[{ ...initialSeries[0], articleSlugs: [article.slug] }]} selectedSeriesSlug={initialSeries[0].slug} />);
    expect(screen.getByText(preview)).toBeTruthy();
  });
  it("provides three valid series, including ten unique AI chapters", () => {
    expect(initialSeries).toHaveLength(3);
    expect(initialSeries[0].articleSlugs).toHaveLength(10);
    expect(validateSeries(fixture())).toEqual(initialSeries);
  });
  it("upgrades only the exact untouched old demonstration", () => {
    const original = [{ ...fixture()[0], articleSlugs: fixture()[0].articleSlugs.slice(0, 2) }];
    expect(upgradeDemoSeries(original)).toEqual(initialSeries);
    expect(upgradeDemoSeries([{ ...original[0], title: "My edited series" }])).toEqual([{ ...original[0], title: "My edited series" }]);
    expect(upgradeDemoSeries([{ ...original[0], articleSlugs: [...original[0].articleSlugs].reverse() }])).toEqual([{ ...original[0], articleSlugs: [...original[0].articleSlugs].reverse() }]);
    expect(upgradeDemoSeries([])).toEqual([]);
    expect(upgradeDemoSeries([...original, { ...fixture()[1], status: "draft" }])).toEqual([...original, { ...fixture()[1], status: "draft" }]);
  });
  it("loads the upgraded untouched demo and preserves custom stored content", () => {
    localStorage.setItem(seriesKey, JSON.stringify([{ ...fixture()[0], articleSlugs: fixture()[0].articleSlugs.slice(0, 2) }]));
    const upgraded = renderHook(useSeriesWorkspace);
    expect(upgraded.result.current.series).toEqual(initialSeries);
    expect(JSON.parse(localStorage.getItem(seriesKey)!)).toEqual(initialSeries);
    upgraded.unmount();
    const edited = [{ ...fixture()[0], title: "Custom", articleSlugs: fixture()[0].articleSlugs.slice(0, 2) }];
    localStorage.setItem(seriesKey, JSON.stringify(edited));
    const custom = renderHook(useSeriesWorkspace);
    expect(custom.result.current.series).toEqual(edited);
    expect(JSON.parse(localStorage.getItem(seriesKey)!)).toEqual(edited);
  });
});
describe("series article navigation", () => {
  it("exposes the series and adjacent chapters without manual completion or guest tracking", async () => {
    const user = userEvent.setup(); const onOpenArticle = vi.fn(); const onOpenSeries = vi.fn();
    render(<SeriesArticleNav articleSlug="iyi-kodun-sessizligi" onOpenArticle={onOpenArticle} onOpenSeries={onOpenSeries} />);
    expect(screen.getByText("2 / 10. bölüm")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /tamamladım|tamamlandı/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Sonraki bölüm →" }));
    expect(onOpenArticle).toHaveBeenCalledWith("problemi-once-tanimlamak");
    await user.click(screen.getByRole("button", { name: "← Önceki bölüm" }));
    expect(onOpenArticle).toHaveBeenCalledWith("yapay-zeka-ile-dusunmek");
    await user.click(screen.getByRole("button", { name: /YZ ile düşün, yaz ve geliştir/ }));
    expect(onOpenSeries).toHaveBeenCalledWith(initialSeries[0].slug);
    expect(localStorage.getItem("mrbyte-blogger:series-progress:v1")).toBeNull();
  });
});
