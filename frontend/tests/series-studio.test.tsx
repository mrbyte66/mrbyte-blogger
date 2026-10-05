import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { articles } from "../lib/content";
import { addBlock, applyDraft, createWorkspace, parseWorkspace } from "../lib/builder/model";
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
function openFirst() { selectPage(initialSeries[0].title); }
function section(name: string) { fireEvent.click(screen.getByRole("button", { name })); }
async function save() { await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Sayfayı kaydet ↗" })); }); }
const studio = (site = new MemorySite()) => { renderWithSite(<SiteEditor />, { site, mode: "studio" }); return site; };

describe("series authoring beside the canvas", () => {
  it("creates a series below an article canvas with a Turkish slug and then edits its chapters", async () => {
    const site = studio(new MemorySite({ series: [initialSeries[0], initialSeries[2]].map((s) => ({ ...s })) }));
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Yeni seri başlığı"), { target: { value: "Şiir ve kültür" } });
    expect((screen.getByLabelText("Yeni seri bağlantısı") as HTMLInputElement).value).toBe("siir-ve-kultur");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Seriyi kaydet" })); });
    expect(screen.queryByLabelText("Yeni seri başlığı")).toBeNull();
    expect(site.series.at(-1)).toMatchObject({ title: "Şiir ve kültür", slug: "siir-ve-kultur", status: "draft", articleSlugs: [] });
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
    selectPage(/Şiir ve kültür/);
    section("Bölümler");
    const picker = screen.getByLabelText("Bölüm ekle");
    expect(within(picker).getByRole("option", { name: /Yapay zekâ ile düşünmek/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(picker, { target: { value: "satir-aralarinda" } });
    await save();
    expect(site.series.at(-1)?.articleSlugs).toEqual(["satir-aralarinda"]);
  });
  it("reorders and removes membership without deleting articles or changing server data before Save", async () => {
    const site = studio(); openFirst(); section("Bölümler");
    fireEvent.click(screen.getByRole("button", { name: "Bölüm 2 yukarı" }));
    expect(site.series[0].articleSlugs.slice(0, 2)).toEqual(initialSeries[0].articleSlugs.slice(0, 2));
    await save();
    expect(site.series[0].articleSlugs.slice(0, 2)).toEqual(["iyi-kodun-sessizligi", "yapay-zeka-ile-dusunmek"]);
    fireEvent.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Seriden çıkar" }));
    await save();
    expect(site.series[0].articleSlugs).not.toContain("iyi-kodun-sessizligi");
    expect(site.article("iyi-kodun-sessizligi")).toBeTruthy();
  });
  it("keeps invalid inline links unsaved and discards the form without affecting the writing draft", () => {
    const site = studio();
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Korunan yazım" } });
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Yeni seri başlığı"), { target: { value: "Yeni seri" } });
    fireEvent.change(screen.getByLabelText("Yeni seri bağlantısı"), { target: { value: "Türkçe Link!" } });
    expect(screen.getByRole("button", { name: "Seriyi kaydet" }).hasAttribute("disabled")).toBe(true);
    expect(site.calls).not.toContain("create series");
    fireEvent.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(screen.queryByLabelText("Yeni seri başlığı")).toBeNull();
    expect((screen.getByLabelText("Yazı başlığı") as HTMLInputElement).value).toBe("Korunan yazım");
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
  });
  it("uploads a cover image and saves presentation in the shared page editor", async () => {
    const site = studio(); openFirst(); section("Kapak görseli");
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "kapak.png", { type: "image/png" });
    await act(async () => { fireEvent.change(screen.getByLabelText("Kapak görseli yükle"), { target: { files: [file] } }); });
    expect(site.calls).toContain("upload kapak.png");
    section("Sayfa düzeni");
    fireEvent.change(screen.getByLabelText("Bölüm görünümü"), { target: { value: "rows" } });
    await save();
    expect(site.series[0].coverImage).toMatch(/^\/api\/v1\/media\/[0-9a-f-]{36}$/);
    expect(site.series[0].presentation).toEqual({ chapterStyle: "rows", heading: "left" });
  });
});

describe("series block contract", () => {
  it("persists card/list presentation with normal structural placement and backward compatibility", () => {
    const workspace = createWorkspace();
    workspace.draft = addBlock(workspace.draft, "footer", "footer");
    workspace.draft = addBlock(workspace.draft, "series", "my-series");
    const block = workspace.draft.blocks.find((item) => item.kind === "series")!;
    expect(block).toMatchObject({ display: "cards", title: "Seriler" });
    expect(workspace.draft.blocks.map((item) => item.kind)).toEqual(["scene", "series", "footer"]);
    if (block.kind === "series") block.display = "list";
    expect(parseWorkspace(JSON.stringify(applyDraft(workspace)))?.applied.blocks[1]).toMatchObject({ kind: "series", display: "list" });
    expect(parseWorkspace(JSON.stringify(createWorkspace()))).toEqual(createWorkspace());
    if (block.kind === "series") (block as { display: string }).display = "invalid";
    expect(parseWorkspace(JSON.stringify(workspace))).toBeNull();
    expect(articles.length).toBeGreaterThan(0);
  });
});

function selectPage(title: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
}
