import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { articleActions, seriesActions } from "../components/data/SiteData";
import { publicArticles, publicSeries } from "../lib/editorial/store";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
import { MemorySite, renderWithSite } from "./support/memory-site";
vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(Element.prototype, "scrollIntoView"); });
function newWriting() {
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
}
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); }); }
async function action(name: string) { fireEvent.click(screen.getByLabelText("İçerik işlemleri")); await click(screen.getByText(name)); }
const studio = (site = new MemorySite()) => { renderWithSite(<SiteEditor />, { site, mode: "studio" }); return site; };
const seriesId = (site: MemorySite, slug: string) => site.series.find((s) => s.slug === slug)!.id;

describe("article-first editorial workflow", () => {
  it("saves an empty writing draft, connects an existing series and publishes it later", async () => {
    const site = studio(); newWriting();
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Yeni bölüm" } });
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: seriesId(site, initialSeries[0].slug) } });
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.article("yeni-bolum")).toMatchObject({ status: "draft" });
    expect(site.series[0].articleSlugs).toContain("yeni-bolum");
    expect(publicArticles(site.articles).some((a) => a.slug === "yeni-bolum")).toBe(false);
    expect(publicSeries(site.series, site.articles)[0].articleSlugs).not.toContain("yeni-bolum");
    fireEvent.click(screen.getByRole("button", { name: "Metin ve paragraflar" }));
    fireEvent.change(screen.getByLabelText("Paragraf 1"), { target: { value: "İlk bölümün metni." } });
    await action("Yayına al");
    expect(publicSeries(site.series, site.articles)[0].articleSlugs).toContain("yeni-bolum");
  });
  it("creates an inline draft series and binds the current writing as its first chapter", async () => {
    const site = studio(); newWriting();
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Yeni seri başlığı"), { target: { value: "Yeni ufuklar" } });
    await click(screen.getByRole("button", { name: "Seriyi kaydet" }));
    const savedSeries = site.series.at(-1)!;
    expect(savedSeries).toMatchObject({ title: "Yeni ufuklar", slug: "yeni-ufuklar", status: "draft" });
    expect((screen.getByLabelText("Yazının serisi") as HTMLSelectElement).value).toBe(savedSeries.id);
    expect(screen.queryByLabelText("Yeni seri başlığı")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Metin ve paragraflar" }));
    fireEvent.change(screen.getByLabelText("Paragraf 1"), { target: { value: "İlk yazı." } });
    await action("Yayına al");
    // The series stays a draft: publishing a series is an explicit, separate owner action (Ü6).
    expect(site.series.at(-1)).toMatchObject({ status: "draft", articleSlugs: [site.articles[0].slug] });
  });
  it("archives, trashes and restores a writing while keeping its text and membership", async () => {
    const site = studio();
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: articles[0].title }));
    await action("Arşivle");
    expect(publicArticles(site.articles)).not.toContainEqual(expect.objectContaining({ slug: articles[0].slug }));
    await action("Sil · çöp kutusuna taşı");
    expect(site.article(articles[0].slug)!.status).toBe("trashed");
    expect(site.series[0].articleSlugs).toContain(articles[0].slug);
    await action("Taslağa geri yükle");
    await action("Yayına al");
    expect(publicArticles(site.articles)).toContainEqual(expect.objectContaining({ slug: articles[0].slug, paragraphs: articles[0].paragraphs }));
  });
  it("archives a series without hiding or deleting its independent articles, then restores it", async () => {
    const site = studio();
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: initialSeries[0].title }));
    await action("Arşivle");
    expect(site.series[0].status).toBe("archived");
    expect(publicSeries(site.series, site.articles).some((s) => s.slug === initialSeries[0].slug)).toBe(false);
    expect(publicArticles(site.articles)).toHaveLength(articles.length);
    await action("Taslağa geri yükle");
    await action("Yayına al");
    expect(site.series[0].status).toBe("published");
    expect(site.series[0].articleSlugs).toEqual(initialSeries[0].articleSlugs);
  });
  it("shows series before writing and exposes trashed records for recovery", async () => {
    const site = new MemorySite();
    site.articles[0] = { ...site.articles[0], status: "trashed" };
    studio(site);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    const menu = screen.getByRole("navigation", { name: "Sayfalar" });
    expect(within(menu).getAllByRole("region").map((group) => group.getAttribute("aria-label"))).toEqual(["Seriler", "Yazılar"]);
    expect(within(menu).getByRole("button", { name: /Yeni seri/ })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("İçerik görünümü"), { target: { value: "trashed" } });
    fireEvent.click(screen.getByRole("button", { name: /Yapay zekâ ile düşünmek/ }));
    await action("Taslağa geri yükle");
    expect(site.article(articles[0].slug)?.status).toBe("draft");
  });
  it("marks writing private so it can never be published by mistake", async () => {
    const site = studio();
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: articles[1].title }));
    fireEvent.click(screen.getByRole("button", { name: "Yayın planı" }));
    fireEvent.click(screen.getByLabelText(/Özel yazı/));
    expect(screen.queryByLabelText("Yayın tarihi ve saati")).toBeNull();
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.article(articles[1].slug)).toMatchObject({ visibility: "private", status: "draft" });
    expect(publicArticles(site.articles).some((a) => a.slug === articles[1].slug)).toBe(false);
  });
});

describe("lifecycle translation to API actions", () => {
  it("maps editor states to the contract's explicit actions", () => {
    expect(articleActions("draft", "public", "published", "public")).toEqual(["publish"]);
    expect(articleActions("published", "public", "scheduled", "public")).toEqual(["save-draft", "schedule"]);
    expect(articleActions("scheduled", "public", "draft", "public")).toEqual(["cancel-schedule"]);
    expect(articleActions("trashed", "public", "published", "public")).toEqual(["restore", "publish"]);
    expect(articleActions("published", "public", "draft", "private")).toEqual(["make-private"]);
    expect(articleActions("draft", "private", "published", "public")).toEqual(["prepare-public", "publish"]);
    expect(articleActions("archived", "private", "draft", "public")).toEqual(["restore", "prepare-public"]);
    expect(seriesActions("archived", "published")).toEqual(["restore", "publish"]);
    expect(seriesActions("published", "published")).toEqual([]);
  });
});


describe("standalone series creation on the live canvas", () => {
  function openSeries() {
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni seri/ }));
  }
  it("opens an unsaved draft on the canvas, creates it on Save and starts its first chapter", async () => {
    const site = studio(); const count = site.articles.length; const seriesCount = site.series.length;
    openSeries();
    expect(screen.getByRole("region", { name: "Canlı sayfa tuvali" })).toBeTruthy();
    expect(screen.queryByLabelText("Yeni seri başlığı")).toBeNull();
    expect(site.series).toHaveLength(seriesCount);
    fireEvent.change(screen.getByLabelText("Seri başlığı"), { target: { value: "Mevsim defteri" } });
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    const created = site.series.at(-1)!;
    expect(site.series).toHaveLength(seriesCount + 1);
    expect(created).toMatchObject({ title: "Mevsim defteri", slug: "mevsim-defteri", status: "draft", articleSlugs: [] });
    expect(site.articles).toHaveLength(count);
    expect(screen.getByRole("button", { name: "Sayfalar: Mevsim defteri" })).toBeTruthy();
    newWriting();
    expect((screen.getByLabelText("Yazının serisi") as HTMLSelectElement).value).toBe(created.id);
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "İlk bölüm" } });
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.series.at(-1)!.articleSlugs).toEqual(["ilk-bolum"]);
  });
  it("keeps the canvas draft after a failed save and creates it once on retry", async () => {
    const site = studio(); const seriesCount = site.series.length;
    vi.spyOn(site.studio, "createSeries").mockRejectedValueOnce(new Error("offline"));
    openSeries();
    fireEvent.change(screen.getByLabelText("Seri başlığı"), { target: { value: "Yeniden dene" } });
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(screen.getByRole("alert").textContent).toContain("Kaydedilemedi");
    expect((screen.getByLabelText("Seri başlığı") as HTMLInputElement).value).toBe("Yeniden dene");
    expect(site.series).toHaveLength(seriesCount);
    await click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(site.series).toHaveLength(seriesCount + 1);
    expect(site.series.at(-1)!.title).toBe("Yeniden dene");
  });
  it("keeps unsaved series edits when leaving is declined and discards an untouched draft", () => {
    const site = studio(); const count = site.series.length;
    openSeries();
    fireEvent.change(screen.getByLabelText("Seri başlığı"), { target: { value: "Kaybolmasın" } });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: site.series[0].title }));
    expect((screen.getByLabelText("Seri başlığı") as HTMLInputElement).value).toBe("Kaybolmasın");
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
    expect(screen.queryByLabelText("Seri başlığı")).toBeNull();
    expect(site.series).toHaveLength(count);
  });
});
