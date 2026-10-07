import { screen } from "@testing-library/react";
import { renderWithSite as render } from "./support/memory-site";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { articleSeries, initialSeries, isValidSeriesCoverImage, publishedSeries, seriesValidationError, slugifySeriesTitle, validateSeries } from "../lib/series/model";
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
  it("accepts legacy levels while removing them from normalized series", () => {
    const legacy = fixture().map((entry, index) => ({ ...entry, level: index === 0 ? "Başlangıç" : "Her seviye" }));
    const normalized = validateSeries(legacy);
    expect(normalized).toEqual(fixture());
    expect(normalized?.every((entry) => !("level" in entry))).toBe(true);
  });
  it("keeps draft series private and chapter order stable", () => {
    const saved = fixture();
    expect(publishedSeries([{ ...saved[0], status: "draft" }])).toEqual([]);
    expect(articleSeries(saved, "iyi-kodun-sessizligi")?.articleSlugs).toEqual(initialSeries[0].articleSlugs);
    expect(slugifySeriesTitle("İleri Şık Çözümler: Yapay Zekâ ve Işık")).toBe("ileri-sik-cozumler-yapay-zeka-ve-isik");
  });
  it("validates and preserves optional local or HTTPS series cover images", () => {
    const series = fixture();
    series[0].coverImage = "/assets/ai-series.jpg";
    expect(validateSeries(series)?.[0].coverImage).toBe("/assets/ai-series.jpg");
    expect(isValidSeriesCoverImage("https://images.example.com/cover.jpg")).toBe(true);
    expect(isValidSeriesCoverImage("//images.example.com/cover.jpg")).toBe(false);
    expect(isValidSeriesCoverImage("javascript:alert(1)")).toBe(false);
    expect(validateSeries([{ ...series[0], coverImage: "javascript:alert(1)" }])).toBeNull();
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
});
describe("series metadata and chapter layout", () => {
  it("renders editorial chapter order without difficulty labels", () => {
    const slugs = ["iyi-kodun-sessizligi", "yapay-zeka-ile-dusunmek", "problemi-once-tanimlamak"];
    const { container } = render(<SeriesCatalog series={[{ ...fixture()[0], articleSlugs: slugs }]} selectedSeriesSlug={initialSeries[0].slug} />);
    expect(screen.queryByText("Başlangıç")).toBeNull();
    expect(screen.queryByText("Her seviye")).toBeNull();
    const cards = [...container.querySelectorAll(".series-chapters > li .article-card-title")];
    expect(cards.map((card) => card.textContent)).toEqual(slugs.map((slug) => articles.find((article) => article.slug === slug)?.title));
    expect(screen.getByText("01 · Bölüm")).toBeTruthy();
    expect(screen.getByText("02 · Bölüm")).toBeTruthy();
    expect(screen.getByText("03 · Bölüm")).toBeTruthy();
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
