import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeEditor } from "../components/builder/ThemeEditor";
import { createTheme, createWorkspace, parseWorkspace } from "../lib/builder/model";
import { previewEvents } from "../lib/builder/preview-protocol";
import { MemorySite, renderWithSite } from "./support/memory-site";
import { ApiError } from "../lib/api/http";

const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
let site: MemorySite;
beforeEach(() => {
  localStorage.clear();
  site = new MemorySite();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false })));
  Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScroll) Object.defineProperty(Element.prototype, "scrollIntoView", originalScroll);
  else Reflect.deleteProperty(Element.prototype, "scrollIntoView");
});

/** The theme workspace as the (in-memory) server stores it. */
function savedWorkspace() { return parseWorkspace(JSON.stringify(site.workspace)); }
function render(ui: React.ReactElement) { return renderWithSite(ui, { site, mode: "studio" }); }
function editorStatus() { return document.querySelector(".studio-status")!.textContent; }
function receive(frame: HTMLIFrameElement, data: unknown, origin = window.location.origin, source: MessageEventSource | null = frame.contentWindow) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, origin, source })); });
}

describe("visual theme authoring", () => {
  it("keeps the desktop canvas at readable actual size when the workspace resizes", async () => {
    const user = userEvent.setup();
    let resize: ResizeObserverCallback | undefined;
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      observe() {}
      disconnect() {}
    });
    render(<ThemeEditor />);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    function resizeCanvas(width: number) {
      act(() => resize?.([{ contentRect: { width } } as ResizeObserverEntry], {} as ResizeObserver));
    }
    resizeCanvas(980);
    expect(frame.style.width).toBe("980px");
    expect(frame.style.transform).toBe("scale(1)");
    resizeCanvas(740);
    expect(frame.style.width).toBe("740px");
    expect(frame.style.transform).toBe("scale(1)");
    await user.click(screen.getByRole("button", { name: "Mobil" }));
    expect(frame.style.width).toBe("390px");
    await user.click(screen.getByRole("button", { name: "Gerçek boyut" }));
    expect(frame.style.width).toBe("740px");
    expect(frame.style.transform).toBe("scale(1)");
  });

  it("keeps page structure available while recovering an empty draft from block settings", async () => {
    const user = userEvent.setup();
    const workspace = createWorkspace();
    workspace.draft.blocks = [];
    site.workspace = workspace;
    render(<ThemeEditor />);
    expect(screen.getByRole("complementary", { name: "Sayfa yapısını düzenle" })).toBeTruthy();
    expect(screen.queryByLabelText("Site adı")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Blok ayarları" }));
    await user.click(screen.getByRole("button", { name: "Blok paletini aç" }));
    expect(screen.getByRole("complementary", { name: "Sayfa yapısını düzenle" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Karakter sahnesi ekle" }));
    expect(screen.getByRole("button", { name: "Blok ayarları" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Başlık")).toBeTruthy();
    expect(savedWorkspace()?.draft.blocks.map((block) => block.kind)).toEqual(["scene"]);
  });

  it("persists a draft independently, then applies it to the homepage snapshot", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    await user.click(screen.getByRole("button", { name: "Açık defter başlangıç düzeni" }));
    await user.clear(screen.getByLabelText("Site adı"));
    await user.type(screen.getByLabelText("Site adı"), "MRBYTE");
    expect(savedWorkspace()?.draft.siteName).toBe("MRBYTE");
    expect(savedWorkspace()?.applied.siteName).toBe("SATIR");
    await user.click(screen.getByRole("button", { name: /Temayı uygula/ }));
    expect(savedWorkspace()?.applied.siteName).toBe("MRBYTE");
    expect(editorStatus()).toContain("Tema uygulandı");
  });

  it("adds body sections, preserves the scene boundary and reorders only the body", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    await user.click(screen.getByRole("button", { name: /Blok ekle/ }));
    await user.click(screen.getByRole("button", { name: "Yazı akışı ekle" }));
    expect(screen.getByRole("button", { name: "Yazı akışı yukarı taşı" }).hasAttribute("disabled")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Alıntı ekle" }));
    await user.click(screen.getByRole("button", { name: "Alıntı yukarı taşı" }));
    expect(savedWorkspace()?.draft.blocks.map((block) => block.kind)).toEqual(["scene", "quote", "articles"]);
    expect(savedWorkspace()?.applied.blocks.map((block) => block.kind)).toEqual(["scene"]);
    expect(screen.getByRole("button", { name: "Giriş mevcut" }).hasAttribute("disabled")).toBe(true);
  });

  it("removes the last block, explains why apply is unavailable and allows undo", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    await user.click(screen.getByRole("button", { name: "Blok ayarları" }));
    await user.click(screen.getByRole("button", { name: /Bloğu kaldır/ }));
    expect(savedWorkspace()?.draft.blocks).toEqual([]);
    expect(savedWorkspace()?.applied.blocks).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Temayı uygula/ }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByText("Uygulamadan önce en az bir içerik bloğu ekle.")).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Sayfa yapısını düzenle" })).toBeTruthy();
    expect(screen.getByText("Sayfan şu an boş. Blok ekleyerek yeni bir düzen oluşturabilirsin.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Karakter sahnesi ekle" })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Son kaldırmayı geri al/ }));
    expect(savedWorkspace()?.draft).toEqual(createWorkspace().draft);
    await user.click(screen.getByRole("button", { name: "Blok ayarları" }));
    expect(screen.getByRole("button", { name: /Bloğu kaldır/ })).toBeTruthy();
  });

  it("loads even the selected starter immediately without a confirmation or selection notice", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "Benim evrenim" } });
    const current = screen.getByRole("button", { name: "Karakterli evren başlangıç düzeni" });
    expect(current.getAttribute("aria-pressed")).toBe("true");
    await user.click(current);
    expect(savedWorkspace()?.draft).toEqual(createTheme("scene"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(editorStatus()).toBe("");
    await user.click(screen.getByRole("button", { name: "Blok ayarları" }));
    expect((screen.getByLabelText("Başlık") as HTMLInputElement).value).toBe("Kod yazarım.");
  });

  it("persists custom color and appearance while keeping invalid color input out of the saved draft", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    await user.click(screen.getByRole("button", { name: "Tema tasarımı" }));
    fireEvent.change(screen.getByLabelText("HEX renk kodu"), { target: { value: "#123456" } });
    await user.selectOptions(screen.getByLabelText("Tipografi"), "editorial");
    await user.selectOptions(screen.getByLabelText("Sayfa atmosferi"), "night");
    await user.selectOptions(screen.getByLabelText("İçerik genişliği"), "wide");
    await user.selectOptions(screen.getByLabelText("Bölüm aralıkları"), "compact");
    expect(savedWorkspace()?.draft).toMatchObject({ accent: "#123456", typography: "editorial", surface: "night", width: "wide", spacing: "compact" });
    expect(savedWorkspace()?.applied).toEqual(createWorkspace().applied);
    fireEvent.change(screen.getByLabelText("HEX renk kodu"), { target: { value: "#bad" } });
    expect(screen.getByLabelText("HEX renk kodu").getAttribute("aria-invalid")).toBe("true");
    expect(savedWorkspace()?.draft.accent).toBe("#123456");
    await user.click(screen.getByRole("button", { name: "Mercan" }));
    expect(savedWorkspace()?.draft.accent).toBe("#ed9383");
    expect((screen.getByLabelText("HEX renk kodu") as HTMLInputElement).value).toBe("#ed9383");
  });

  it("switches an edited draft immediately while restore still requires confirmation", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    fireEvent.change(screen.getByLabelText("Başlık"), { target: { value: "Yeni başlık" } });
    await user.click(screen.getByRole("button", { name: "Açık defter başlangıç düzeni" }));
    expect(savedWorkspace()?.draft).toEqual(createTheme("feed"));
    expect(savedWorkspace()?.applied).toEqual(createWorkspace().applied);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Taslağı uygulanan temaya döndür/ }));
    expect(screen.getByRole("dialog").hasAttribute("open")).toBe(true);
    await user.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(savedWorkspace()?.draft).toEqual(createTheme("feed"));
    await user.click(screen.getByRole("button", { name: /Taslağı uygulanan temaya döndür/ }));
    await user.click(screen.getByRole("button", { name: "Taslağı değiştir" }));
    await waitFor(() => expect(savedWorkspace()?.draft).toEqual(createWorkspace().applied));
  });

  it("reports failed apply without claiming or persisting a new applied snapshot", async () => {
    const user = userEvent.setup();
    render(<ThemeEditor />);
    await user.click(screen.getByRole("button", { name: "Açık defter başlangıç düzeni" }));
    site.failNext = new ApiError(503, "SERVICE_UNAVAILABLE", "Sunucu şu anda yanıt veremiyor.");
    await user.click(screen.getByRole("button", { name: /Temayı uygula/ }));
    expect(editorStatus()).toContain("Tema uygulanamadı");
    expect(savedWorkspace()?.applied).toEqual(createWorkspace().applied);
    expect(screen.getByRole("button", { name: /Temayı uygula/ }).hasAttribute("disabled")).toBe(false);
  });

  it("links list selection to the canvas and accepts canvas selection only from its own trusted frame", async () => {
    const user = userEvent.setup();
    site.workspace = { ...createWorkspace(), draft: createTheme("feed") };
    render(<ThemeEditor />);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    await user.click(screen.getByRole("button", { name: /^Yazı akışı\s*İçerik bölümü$/ }));
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: previewEvents.selection, id: "block-articles", editing: true, request: 1 }), window.location.origin);
    const structure = screen.getByRole("complementary", { name: "Sayfa yapısını düzenle" });
    const properties = screen.getByRole("complementary", { name: "Düzenleme özellikleri" });
    expect(within(structure).getByRole("button", { name: /^Yazı akışı\s*İçerik bölümü$/ }).getAttribute("aria-pressed")).toBe("true");
    expect(within(properties).getByRole("heading", { name: "Yazı akışı" })).toBeTruthy();
    expect(within(structure).getByRole("button", { name: /Blok ekle/ })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Tema tasarımı" }));
    receive(frame, { type: previewEvents.select, id: "block-quote" }, "https://foreign.example");
    receive(frame, { type: previewEvents.select, id: "block-quote" }, window.location.origin, window);
    receive(frame, { type: previewEvents.select, id: "missing-block" });
    expect(screen.getByLabelText("Site adı")).toBeTruthy();
    await user.click(within(structure).getByRole("button", { name: /Blok ekle/ }));
    expect(within(structure).getByRole("button", { name: "Projeler ekle" })).toBeTruthy();
    expect(within(properties).getByLabelText("Site adı")).toBeTruthy();
    receive(frame, { type: previewEvents.select, id: "block-quote" });
    const inspector = screen.getByRole("complementary", { name: "Düzenleme özellikleri" });
    expect(within(inspector).getByRole("heading", { name: "Alıntı" })).toBeTruthy();
    expect(within(inspector).getByLabelText("Alıntı / düşünce")).toBeTruthy();
    expect(editorStatus()).toContain("Tuvalde seçtiğin bölümün ayarları açıldı");
    await user.click(screen.getByRole("button", { name: "Seçimi gizle" }));
    expect(within(inspector).getByLabelText("Alıntı / düşünce")).toBeTruthy();
    expect(post).toHaveBeenLastCalledWith(expect.objectContaining({ type: previewEvents.selection, id: null }), window.location.origin);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
