import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraftPreview } from "../components/builder/ThemeRenderer";
import { PreviewCanvas } from "../components/builder/PreviewCanvas";
import { createWorkspace } from "../lib/builder/model";
import { previewEvents } from "../lib/builder/preview-protocol";
import { navigateEvent } from "../lib/builder/document-protocol";
vi.mock("../components/Experience", () => ({ Experience: ({ showFeaturedSeries, showFeaturedArticle }: { showFeaturedSeries: boolean; showFeaturedArticle: boolean }) => <div>
  {showFeaturedSeries && <button data-scene-field="featured-series" data-series="yapay-zeka-ile-yazilim" onClick={() => window.parent.postMessage({ type: "unexpected-navigation" }, window.location.origin)}>Seri kartı</button>}
  {showFeaturedArticle && <button data-scene-field="featured-article" data-article="yapay-zeka-ile-dusunmek">Yazı kartı</button>}
  <button onClick={() => window.parent.postMessage({ type: "unexpected-action" }, window.location.origin)}>＋</button>
</div> }));
beforeEach(() => { localStorage.clear(); vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} }); vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false }))); Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() }); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(Element.prototype, "scrollIntoView"); });
function parentMessage(data: unknown, origin = window.location.origin) { act(() => { window.dispatchEvent(new MessageEvent("message", { source: window.parent, origin, data })); }); }
describe("Studio canvas isolation", () => {
  it("renders visibility changes immediately from the trusted draft, independent of storage", () => {
    render(<DraftPreview embedded />);
    const workspace = createWorkspace(); const scene = workspace.draft.blocks[0];
    if (scene.kind !== "scene") throw new Error("scene expected");
    scene.showFeaturedSeries = false;
    parentMessage({ type: previewEvents.workspace, workspace: JSON.stringify(workspace) }, "https://foreign.example");
    expect(screen.getByRole("button", { name: "Seri kartı" })).toBeTruthy();
    parentMessage({ type: previewEvents.workspace, workspace: JSON.stringify(workspace) });
    expect(screen.queryByRole("button", { name: "Seri kartı" })).toBeNull();
    expect(screen.getByRole("button", { name: "Yazı kartı" })).toBeTruthy();
    scene.showFeaturedSeries = true; scene.showFeaturedArticle = false;
    parentMessage({ type: previewEvents.workspace, workspace: JSON.stringify(workspace) });
    expect(screen.getByRole("button", { name: "Seri kartı" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Yazı kartı" })).toBeNull();
  });
  it("selects the matching card settings in edit mode and ignores passive actions", () => {
    render(<DraftPreview embedded />);
    const post = vi.spyOn(window.parent, "postMessage"); post.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Seri kartı" }));
    expect(post).toHaveBeenCalledExactlyOnceWith({ type: previewEvents.select, id: "block-scene", field: "featured-series" }, window.location.origin);
    post.mockClear(); fireEvent.click(screen.getByRole("button", { name: "＋" })); expect(post).not.toHaveBeenCalled();
    parentMessage({ type: previewEvents.selection, id: null, request: 0, editing: false });
    fireEvent.click(screen.getByRole("button", { name: "Seri kartı" }));
    expect(post).toHaveBeenCalledWith({ type: navigateEvent, target: { kind: "series", slug: "yapay-zeka-ile-yazilim" } }, window.location.origin);
  });
  it("ignores navigation messages while editing, and accepts them only in browsing mode", () => {
    const onNavigate = vi.fn(); const onSelect = vi.fn(); const workspace = createWorkspace();
    const selection = { id: null, request: 0, editing: true };
    const { rerender } = render(<PreviewCanvas workspace={workspace} mobile={false} selection={selection} onSelect={onSelect} onNavigate={onNavigate} />);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    const receive = (data: unknown) => act(() => { window.dispatchEvent(new MessageEvent("message", { source: frame.contentWindow, origin: window.location.origin, data })); });
    const message = { type: navigateEvent, target: { kind: "series", slug: "yapay-zeka-ile-yazilim" } };
    receive(message); expect(onNavigate).not.toHaveBeenCalled();
    receive({ type: previewEvents.select, id: "block-scene", field: "featured-series" });
    expect(onSelect).toHaveBeenCalledWith("block-scene", "featured-series");
    rerender(<PreviewCanvas workspace={workspace} mobile={false} selection={{ ...selection, editing: false }} onSelect={onSelect} onNavigate={onNavigate} />);
    receive(message); expect(onNavigate).toHaveBeenCalledWith(message.target);
  });
});
