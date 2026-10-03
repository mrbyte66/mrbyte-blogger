import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { articles } from "../lib/content";
import { addBlock, applyDraft, createWorkspace, parseWorkspace } from "../lib/builder/model";
import { initialSeries, validateSeries } from "../lib/series/model";
import { seriesKey } from "../lib/series/use-series-workspace";
const previousScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); if (previousScroll) Object.defineProperty(Element.prototype, "scrollIntoView", previousScroll); else Reflect.deleteProperty(Element.prototype, "scrollIntoView"); });
function storedSeries() { return validateSeries(JSON.parse(localStorage.getItem(seriesKey)!))!; }
function openFirst() { selectPage(initialSeries[0].title); }
function section(name: string) { fireEvent.click(screen.getByRole("button", { name })); }
function save() { fireEvent.click(screen.getByRole("button", { name: "Sayfayı kaydet ↗" })); }
describe("series authoring beside the canvas", () => {
  it("creates a draft with an automatic Turkish slug and prevents duplicate membership", () => {
    localStorage.setItem(seriesKey, JSON.stringify([initialSeries[0], initialSeries[2]]));
    render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni seri oluştur|Yeni seri/ }));
    fireEvent.change(screen.getByLabelText("Seri başlığı"), { target: { value: "Şiir ve kültür" } });
    section("Seri bilgileri");
    expect((screen.getByLabelText("Kalıcı bağlantı adı") as HTMLInputElement).value).toBe("siir-ve-kultur");
    section("Bölümler");
    const picker = screen.getByLabelText("Bölüm ekle");
    expect(within(picker).getByRole("option", { name: /Yapay zekâ ile düşünmek/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(picker, { target: { value: "satir-aralarinda" } });
    save();
    expect(storedSeries().at(-1)).toMatchObject({ title: "Şiir ve kültür", slug: "siir-ve-kultur", status: "draft", articleSlugs: ["satir-aralarinda"] });
  });
  it("reorders and removes membership without deleting articles or changing saved data before Save", () => {
    render(<SiteEditor />); openFirst(); section("Bölümler");
    fireEvent.click(screen.getByRole("button", { name: "Bölüm 2 yukarı" }));
    expect(localStorage.getItem(seriesKey)).toBeNull();
    save();
    expect(storedSeries()[0].articleSlugs.slice(0, 2)).toEqual(["iyi-kodun-sessizligi", "yapay-zeka-ile-dusunmek"]);
    fireEvent.click(within(screen.getAllByRole("listitem")[0]).getByRole("button", { name: "Seriden çıkar" }));
    save();
    expect(storedSeries()[0].articleSlugs).not.toContain("iyi-kodun-sessizligi");
    expect(articles.find((a) => a.slug === "iyi-kodun-sessizligi")).toBeTruthy();
  });
  it("keeps invalid links and empty publication unsaved until corrected or discarded", () => {
    render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni seri/ }));
    section("Seri bilgileri");
    fireEvent.change(screen.getByLabelText("Kalıcı bağlantı adı"), { target: { value: "Türkçe Link!" } });
    expect(screen.getByRole("button", { name: /Sayfayı kaydet/ }).hasAttribute("disabled")).toBe(true);
    fireEvent.change(screen.getByLabelText("Kalıcı bağlantı adı"), { target: { value: "yeni-seri" } });
    fireEvent.change(screen.getByLabelText("Görünürlük"), { target: { value: "published" } });
    expect(screen.getByRole("button", { name: /Sayfayı kaydet/ }).hasAttribute("disabled")).toBe(true);
    expect(localStorage.getItem(seriesKey)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
    expect(screen.queryByLabelText("Kalıcı bağlantı adı")).toBeNull();
  });
  it("saves cover images and presentation in the shared page editor", () => {
    render(<SiteEditor />); openFirst(); section("Kapak görseli");
    fireEvent.change(screen.getByLabelText("Kapak görseli"), { target: { value: "/assets/ai-series.jpg" } });
    section("Sayfa düzeni");
    fireEvent.change(screen.getByLabelText("Bölüm görünümü"), { target: { value: "rows" } });
    save();
    expect(storedSeries()[0]).toMatchObject({ coverImage: "/assets/ai-series.jpg", presentation: { chapterStyle: "rows", heading: "left" } });
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
  });
});

function selectPage(title: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
}
