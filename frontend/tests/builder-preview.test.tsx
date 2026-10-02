import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PreviewCanvas } from "../components/builder/PreviewCanvas";
import { ThemeRenderer } from "../components/builder/ThemeRenderer";
import { accentForeground, themeAppearance } from "../lib/builder/appearance";
import { createTheme, createWorkspace, type Theme } from "../lib/builder/model";
import { isBlockId, parseCanvasSelection, previewEvents, type CanvasSelection } from "../lib/builder/preview-protocol";

vi.mock("../components/Experience", () => ({ Experience: () => <div>Character scene</div> }));
const originalScroll = Object.getOwnPropertyDescriptor(Element.prototype, "scrollIntoView");
beforeEach(() => {
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
function receive(frame: HTMLIFrameElement, data: unknown, origin = window.location.origin, source: MessageEventSource | null = frame.contentWindow) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, origin, source })); });
}
const selection: CanvasSelection = { id: "block-intro", request: 1, editing: true };

describe("preview message protocol", () => {
  it("accepts a selection and clear selection without retaining extra payload fields", () => {
    expect(parseCanvasSelection({ type: previewEvents.selection, ...selection, unexpected: "ignored" })).toEqual(selection);
    expect(parseCanvasSelection({ type: previewEvents.selection, id: null, request: 0, editing: false })).toEqual({ id: null, request: 0, editing: false });
    expect(isBlockId("block-123")).toBe(true);
  });
  it.each([
    null, "selection", {},
    { type: previewEvents.select, ...selection },
    { type: previewEvents.selection, ...selection, request: -1 },
    { type: previewEvents.selection, ...selection, request: 1.5 },
    { type: previewEvents.selection, ...selection, request: Number.MAX_SAFE_INTEGER + 1 },
    { type: previewEvents.selection, ...selection, editing: "true" },
    { type: previewEvents.selection, ...selection, id: "<script>" },
    { type: previewEvents.selection, ...selection, id: "x".repeat(81) },
  ])("ignores malformed selection payload %#", (payload) => {
    expect(parseCanvasSelection(payload)).toBeNull();
  });

  it("synchronizes the current draft only after a trusted canvas readiness message", () => {
    const workspace = createWorkspace();
    const onSelect = vi.fn();
    const { rerender } = render(<PreviewCanvas workspace={workspace} mobile={false} selection={selection} onSelect={onSelect} />);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    receive(frame, { type: previewEvents.ready }, "https://foreign.example");
    receive(frame, { type: previewEvents.ready }, window.location.origin, window);
    expect(post).not.toHaveBeenCalled();
    expect(screen.getByText("Tuval hazırlanıyor…")).toBeTruthy();
    const next = { ...workspace, draft: { ...createTheme("feed"), siteName: "LATEST" } };
    rerender(<PreviewCanvas workspace={next} mobile={false} selection={selection} onSelect={onSelect} />);
    post.mockClear();
    receive(frame, { type: previewEvents.ready });
    expect(screen.queryByText("Tuval hazırlanıyor…")).toBeNull();
    expect(post).toHaveBeenCalledWith({ type: previewEvents.workspace, workspace: JSON.stringify(next) }, window.location.origin);
    expect(post).toHaveBeenCalledWith({ type: previewEvents.selection, ...selection }, window.location.origin);
    post.mockClear();
    fireEvent.load(frame);
    expect(post).toHaveBeenCalledWith({ type: previewEvents.workspace, workspace: JSON.stringify(next) }, window.location.origin);
  });

  it("rejects foreign selections and stale ids after a block is removed", () => {
    const workspace = createWorkspace();
    const onSelect = vi.fn();
    const { rerender } = render(<PreviewCanvas workspace={workspace} mobile={false} selection={selection} onSelect={onSelect} />);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    receive(frame, { type: previewEvents.select, id: "block-scene" }, "https://foreign.example");
    receive(frame, { type: previewEvents.select, id: "block-scene" }, window.location.origin, window);
    receive(frame, { type: previewEvents.select, id: "unknown" });
    receive(frame, { type: previewEvents.select, id: "<script>" });
    expect(onSelect).not.toHaveBeenCalled();
    receive(frame, { type: previewEvents.select, id: "block-scene" });
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("block-scene");
    rerender(<PreviewCanvas workspace={{ ...workspace, draft: { ...workspace.draft, blocks: [] } }} mobile={false} selection={selection} onSelect={onSelect} />);
    onSelect.mockClear();
    receive(frame, { type: previewEvents.select, id: "block-scene" });
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe("rendered theme appearance and canvas interaction", () => {
  it("applies all visual choices and custom accent to the renderer while preserving article urls", () => {
    const theme: Theme = { ...createTheme("magazine"), accent: "#123456", surface: "night", spacing: "compact" };
    const { container } = render(<ThemeRenderer theme={theme} />);
    const main = screen.getByRole("main");
    expect(main.className).toContain("typography-editorial surface-night width-wide spacing-compact");
    expect(main.style.getPropertyValue("--theme-accent")).toBe("#123456");
    expect(main.style.getPropertyValue("--accent")).toBe("#123456");
    expect(main.style.getPropertyValue("--accent-ink")).toBe("#ffffff");
    expect(container.querySelector(".feed-cards")).not.toBeNull();
    expect(container.querySelector(".feed-article")?.getAttribute("href")).toMatch(/^\/yazilar\/[a-z0-9-]+$/);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(main.className).not.toContain("canvas-editing");
  });

  it("chooses readable accent text for dark and light colors", () => {
    expect(accentForeground("#000000")).toBe("#ffffff");
    expect(accentForeground("#ffffff")).toBe("#17251c");
    expect(accentForeground("#777777")).toBe("#000000");
    expect(themeAppearance(createTheme("feed")).style).toMatchObject({ "--theme-accent": "#c8efbc", "--accent-ink": "#17251c" });
  });

  it("highlights and scrolls the selected block, then lets mouse and keyboard select another block", () => {
    const theme = createTheme("feed");
    const onSelect = vi.fn();
    const { container, rerender } = render(<ThemeRenderer theme={theme} preview selection={selection} onSelect={onSelect} />);
    const intro = screen.getByRole("group", { name: "Giriş düzenleme alanı" });
    expect(intro.className).toContain("is-active");
    expect(screen.getByRole("main").className).toContain("canvas-spotlight");
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    const articleLink = container.querySelector(".feed-article")!;
    expect(fireEvent.click(articleLink)).toBe(false);
    expect(onSelect).toHaveBeenCalledWith("block-articles");
    const quote = screen.getByRole("group", { name: "Alıntı düzenleme alanı" });
    fireEvent.keyDown(quote, { key: "Enter" });
    expect(onSelect).toHaveBeenLastCalledWith("block-quote");
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true })));
    rerender(<ThemeRenderer theme={theme} preview selection={{ ...selection, request: 2 }} onSelect={onSelect} />);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("disables edit interception and spotlight in visitor mode and after deleting the selected block", () => {
    const theme = createTheme("feed");
    const onSelect = vi.fn();
    const { container, rerender } = render(<ThemeRenderer theme={theme} preview selection={{ ...selection, editing: false }} onSelect={onSelect} />);
    expect(screen.queryByRole("group", { name: "Giriş düzenleme alanı" })).toBeNull();
    expect(screen.getByRole("main").className).not.toContain("canvas-spotlight");
    fireEvent.click(container.querySelector('[data-block-id="block-quote"]')!);
    expect(onSelect).not.toHaveBeenCalled();
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    rerender(<ThemeRenderer theme={{ ...theme, blocks: [] }} preview selection={selection} onSelect={onSelect} />);
    expect(screen.getByText("Boş bir tuval. Yeni bir başlangıç.")).toBeTruthy();
    expect(screen.getByRole("main").className).not.toContain("canvas-spotlight");
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
});
