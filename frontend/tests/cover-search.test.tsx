import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { ApiError } from "../lib/api/http";
import type { CoverJobDto, CoverSelectionDto } from "../lib/api/mapping";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
import { MemorySite, renderWithSite } from "./support/memory-site";

const previousScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); if (previousScroll) Object.defineProperty(Element.prototype, "scrollIntoView", previousScroll); else Reflect.deleteProperty(Element.prototype, "scrollIntoView"); });

function deferred<T>() { let resolve!: (value: T) => void; let reject!: (cause: unknown) => void; const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; }
const job = (id: string, names: string[]): CoverJobDto => ({ id, state: "done", errorCode: null, candidates: names.map((name) => ({ candidateId: name, thumbnailUrl: `https://images.pexels.com/${name}.jpeg`, sourceUrl: `https://www.pexels.com/photo/${name}/`, photographer: `Foto ${name}`, photographerUrl: `https://www.pexels.com/@${name}`, licenseUrl: "https://www.pexels.com/license/", alt: name })) });

function open(title: string | RegExp, site = new MemorySite()) {
  renderWithSite(<SiteEditor />, { site, mode: "studio" });
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
  fireEvent.click(screen.getByRole("button", { name: "Kapak görseli" }));
  return site;
}
const searchBox = () => screen.getByRole("searchbox", { name: "Çevrimiçi kapak ara" });
async function searchFor(query: string) {
  fireEvent.change(searchBox(), { target: { value: query } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Ara" })); });
}
const existingCover = "/api/v1/media/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const withCover = () => new MemorySite({ series: initialSeries.map((s, i) => ({ ...s, articleSlugs: [...s.articleSlugs], ...(i === 0 ? { coverImage: existingCover } : {}) })) });
async function save() { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sayfayı kaydet ↗" })); }); }

describe("online cover search in the Studio cover panel", () => {
  it("previews licensed results with attribution outside the select buttons and stores the chosen cover on save", async () => {
    const site = open(initialSeries[0].title);
    expect((searchBox() as HTMLInputElement).value).toBe(initialSeries[0].title);
    await searchFor("sessiz kütüphane");
    expect(site.calls).toContain("search covers series sessiz kütüphane");
    const results = screen.getByRole("list", { name: "Kapak sonuçları" });
    const cards = within(results).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const pick = within(cards[0]).getByRole("button", { name: "Kapak olarak seç: Sonuç 1" });
    // Credit links are siblings of the select button, never nested inside it.
    expect(within(pick).queryByRole("link")).toBeNull();
    expect(within(cards[0]).getByRole("link", { name: "Fotoğrafçı 1" }).getAttribute("href")).toBe("https://www.pexels.com/@f1");
    expect(within(cards[0]).getByRole("link", { name: "Kaynak" }).getAttribute("rel")).toBe("noopener noreferrer");
    expect(within(cards[0]).getByRole("link", { name: "Lisans" }).getAttribute("href")).toBe("https://www.pexels.com/license/");
    expect(screen.getByRole("link", { name: "Pexels" })).toBeTruthy();
    expect(site.series[0].coverImage).toBe(initialSeries[0].coverImage);

    await act(async () => { fireEvent.click(pick); });
    expect(site.calls).toContain("select cover p1");
    expect(screen.getByText("Kapak seçildi. Yayına yansıması için sayfayı kaydet.")).toBeTruthy();
    expect(screen.getByText("Seçilen kapağın kaynağı")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Seri kapağı önizlemesi" }).getAttribute("src")).toMatch(/^\/api\/v1\/media\//);
    expect(site.series[0].coverImage).toBe(initialSeries[0].coverImage);
    await save();
    expect(site.series[0].coverImage).toMatch(/^\/api\/v1\/media\/[0-9a-f-]{36}$/);
  });

  it("ignores a late response from an older search", async () => {
    const site = new MemorySite();
    const first = deferred<CoverJobDto>(); const second = deferred<CoverJobDto>();
    site.studio.searchCovers = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    open(initialSeries[0].title, site);
    fireEvent.change(searchBox(), { target: { value: "deniz" } });
    fireEvent.submit(searchBox().closest("form")!);
    fireEvent.change(searchBox(), { target: { value: "orman" } });
    fireEvent.submit(searchBox().closest("form")!);
    await act(async () => { second.resolve(job("job-2", ["orman"])); });
    await act(async () => { first.resolve(job("job-1", ["deniz"])); });
    expect(screen.getByRole("button", { name: "Kapak olarak seç: orman" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kapak olarak seç: deniz" })).toBeNull();
  });

  it("drops a selection that finishes after the owner uploaded their own image", async () => {
    const site = withCover();
    const pending = deferred<CoverSelectionDto>();
    site.studio.selectCover = vi.fn(() => pending.promise);
    open(initialSeries[0].title, site);
    await searchFor("dağ");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Kapak olarak seç: Sonuç 1" })); });
    expect(screen.getByRole("button", { name: "Kapak olarak seç: Sonuç 2" }).hasAttribute("disabled")).toBe(true);
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "kendi.png", { type: "image/png" });
    await act(async () => { fireEvent.change(screen.getByLabelText("Kapağı değiştir"), { target: { files: [file] } }); });
    const uploaded = screen.getByRole("img", { name: "Seri kapağı önizlemesi" }).getAttribute("src");
    await act(async () => { pending.resolve({ assetId: "99999999-9999-4999-8999-999999999999", url: "/api/v1/media/99999999-9999-4999-8999-999999999999" }); });
    expect(screen.getByRole("img", { name: "Seri kapağı önizlemesi" }).getAttribute("src")).toBe(uploaded);
    expect(screen.queryByText("Kapak seçildi. Yayına yansıması için sayfayı kaydet.")).toBeNull();
    expect(screen.getByRole("button", { name: "Kapak olarak seç: Sonuç 2" }).hasAttribute("disabled")).toBe(false);
  });

  it("still shows a pending search's results after the owner changes the cover meanwhile", async () => {
    const site = withCover();
    const pending = deferred<CoverJobDto>();
    site.studio.searchCovers = vi.fn(() => pending.promise);
    open(initialSeries[0].title, site);
    fireEvent.submit(searchBox().closest("form")!);
    fireEvent.click(screen.getByRole("button", { name: "Kapağı kaldır" }));
    await act(async () => { pending.resolve(job("job", ["göl"])); });
    expect(screen.getByRole("button", { name: "Kapak olarak seç: göl" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ara" })).toBeTruthy();
  });

  it("explains provider outages, failed or empty searches and download errors while keeping manual options", async () => {
    const site = withCover();
    open(initialSeries[0].title, site);
    site.failNext = new ApiError(503, "COVER_PROVIDER_UNAVAILABLE", "Kapak sağlayıcısı yapılandırılmamış");
    await searchFor("şehir");
    expect(screen.getByRole("alert").textContent).toContain("Çevrimiçi kapak araması şu anda kullanılamıyor");
    expect(screen.getByLabelText("Kapağı değiştir")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kapağı kaldır" })).toBeTruthy();

    site.studio.searchCovers = vi.fn().mockResolvedValueOnce({ id: "f", state: "failed", candidates: [], errorCode: "PROVIDER_ERROR" }).mockResolvedValueOnce(job("e", []));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Yeniden dene" })); });
    expect(screen.getByRole("alert").textContent).toContain("arama kotası doldu");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Yeniden dene" })); });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText(/uygun görsel bulunamadı/)).toBeTruthy();

    site.studio.searchCovers = vi.fn().mockResolvedValue(job("ok", ["kent"]));
    site.studio.selectCover = vi.fn().mockRejectedValue(new ApiError(502, "COVER_DOWNLOAD_FAILED", "Görsel indirilemedi"));
    await searchFor("kent");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Kapak olarak seç: kent" })); });
    expect(screen.getByText("Görsel indirilemedi. Yeniden dene veya başka bir sonuç seç.")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Seri kapağı önizlemesi" }).getAttribute("src")).toBe(existingCover);
  });

  it("adds a cover panel to articles, never pre-fills private titles and still allows leaving the cover empty", async () => {
    const target = articles[0];
    const site = new MemorySite({ articles: articles.map((a) => a.slug === target.slug ? { ...a, visibility: "private", status: "draft" } : { ...a }) });
    open(new RegExp(`^${target.title}`), site);
    expect((searchBox() as HTMLInputElement).value).toBe("");
    expect(screen.getByText(/Özel yazının başlığı sağlayıcıya gönderilmez/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ara" }).hasAttribute("disabled")).toBe(true);
    await searchFor("kahve");
    expect(site.calls).toContain("search covers article kahve");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Kapak olarak seç: Sonuç 2" })); });
    await save();
    expect(site.article(target.slug)?.coverUrl).toMatch(/^\/api\/v1\/media\//);
    fireEvent.click(screen.getByRole("button", { name: "Kapağı kaldır" }));
    await save();
    expect(site.article(target.slug)?.coverUrl).toBeUndefined();
  });

  it("asks to save a new article before searching online", () => {
    open(initialSeries[0].title);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.click(screen.getByRole("button", { name: "Kapak görseli" }));
    expect(screen.getByText("Çevrimiçi kapak aramak için önce sayfayı kaydet.")).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
  });
});
