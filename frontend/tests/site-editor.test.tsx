import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticlePage } from "../components/builder/ArticlePage";
import { navigateArticles, initialNavigation } from "../lib/navigation";
import { SiteEditor } from "../components/builder/SiteEditor";
import { articleStorageKey, useArticles } from "../lib/articles/use-articles";
import { createArticle, parseArticles, validateArticle } from "../lib/articles/model";
import { articles } from "../lib/content";
import { documentEvent, navigateEvent, parseDocumentDraft, parseStudioTarget } from "../lib/builder/document-protocol";
import { previewEvents } from "../lib/builder/preview-protocol";
import { initialSeries } from "../lib/series/model";
import { seriesKey, useSeriesWorkspace } from "../lib/series/use-series-workspace";
vi.mock("../components/Experience", () => ({ Experience: () => <div>Scene</div> }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function message(data: unknown, origin = window.location.origin) {
  const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, source: frame.contentWindow, origin })); });
}
describe("page editing and visitor content", () => {
  it("previews an article draft, blocks navigation until saved, and updates shared visitor content after save", () => {
    const reader = renderHook(useArticles);
    render(<SiteEditor />);
    selectPage(articles[0].title);
    const frame = screen.getByTitle("Taslak tema canlı önizleme") as HTMLIFrameElement;
    const post = vi.spyOn(frame.contentWindow!, "postMessage");
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Yeni başlık" } });
    expect(post).toHaveBeenCalledWith(expect.objectContaining({ type: documentEvent, document: expect.objectContaining({ article: expect.objectContaining({ title: "Yeni başlık" }) }) }), window.location.origin);
    expect(reader.result.current.articles[0].title).toBe(articles[0].title);
    expect(localStorage.getItem(articleStorageKey)).toBeNull();
    selectPage(/Ana sayfa/);
    expect(screen.getByText(/Sayfa değiştirmeden önce/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(reader.result.current.articles[0].title).toBe("Yeni başlık");
    expect(JSON.parse(localStorage.getItem(articleStorageKey)!)[0].title).toBe("Yeni başlık");
    message({ type: previewEvents.select, id: "excerpt" }, "https://foreign.example");
    expect(screen.queryByLabelText("Özet / abstract")).toBeNull();
    message({ type: previewEvents.select, id: "excerpt" });
    expect(screen.getByLabelText("Özet / abstract")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Gezin" }));
    message({ type: navigateEvent, target: { kind: "series", slug: initialSeries[0].slug } });
    expect(screen.getByLabelText("Seri başlığı")).toBeTruthy();
  });
  it("creates an independent article, persists its permalink and renders it without series membership", () => {
    const reader = renderHook(useArticles);
    const editor = render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Özgür düşünce" } });
    expect(screen.getByRole("button", { name: /Sayfayı kaydet/ }).hasAttribute("disabled")).toBe(false);
    message({ type: previewEvents.select, id: "body" });
    fireEvent.change(screen.getByLabelText("Paragraf 1"), { target: { value: "Bir seriye bağlı olmayan yazım." } });
    expect(localStorage.getItem(articleStorageKey)).toBeNull();
    fireEvent.click(screen.getByLabelText("İçerik işlemleri"));
    fireEvent.click(screen.getByText("Yayına al"));
    const created = reader.result.current.articles[0];
    expect(created).toMatchObject({ title: "Özgür düşünce", slug: "ozgur-dusunce", authored: true });
    expect(parseArticles(localStorage.getItem(articleStorageKey)!)?.[0]).toEqual(created);
    expect(localStorage.getItem(seriesKey)).toBeNull();
    expect(navigateArticles(initialNavigation, { type: "article", slug: created.slug }, reader.result.current.articles).articleSlug).toBe(created.slug);
    editor.unmount();
    render(<ArticlePage slug={created.slug} />);
    expect(screen.getByRole("heading", { name: "Özgür düşünce" })).toBeTruthy();
    expect(screen.getByText("Bir seriye bağlı olmayan yazım.")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Seri bölümleri" })).toBeNull();
    expect(screen.queryByText(/hazırlanmış bir örnektir/)).toBeNull();
  });
  it("protects existing articles from new permalink collisions and discards unsaved writing", () => {
    const reader = renderHook(useArticles);
    const fresh = { ...createArticle(), slug: articles[0].slug, paragraphs: ["New content"] };
    act(() => { expect(reader.result.current.save(fresh, true)).toBe(false); });
    expect(reader.result.current.articles[0]).toEqual(articles[0]);
    expect(localStorage.getItem(articleStorageKey)).toBeNull();
    render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yeni yazı/ }));
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
    expect(screen.queryByLabelText("Yazı başlığı")).toBeNull();
    expect(localStorage.getItem(articleStorageKey)).toBeNull();
  });
  it("can add a saved custom article to a series later and restores its membership", () => {
    const writer = renderHook(useArticles);
    const record = { ...createArticle(), slug: "bagimsiz-yazi", title: "Bağımsız yazı", paragraphs: ["Metin."] };
    act(() => { expect(writer.result.current.save(record, true)).toBe(true); });
    const collection = renderHook(useSeriesWorkspace);
    act(() => { expect(collection.result.current.save([{ ...initialSeries[0], articleSlugs: [...initialSeries[0].articleSlugs, record.slug] }])).toBe(true); });
    expect(collection.result.current.series[0].articleSlugs).toContain(record.slug);
    collection.unmount();
    const restored = renderHook(useSeriesWorkspace);
    expect(restored.result.current.series[0].articleSlugs).toContain(record.slug);
  });
  it("searches the unified page menu and dismisses it with Escape", () => {
    render(<SiteEditor />);
    const trigger = screen.getByRole("button", { name: /^Sayfalar:/ });
    fireEvent.click(trigger);
    fireEvent.change(screen.getByLabelText("Sayfa ara"), { target: { value: "sessizliği" } });
    expect(screen.getByRole("button", { name: "İyi kodun sessizliği" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: articles[0].title })).toBeNull();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Sayfalar" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it("returns to the saved article on revert and reports failed persistence without publishing the draft", () => {
    render(<SiteEditor />);
    selectPage(articles[0].title);
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Not saved" } });
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(screen.getByRole("alert").textContent).toContain("kaydedilemedi");
    expect(localStorage.getItem(articleStorageKey)).toBeNull();
    write.mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
    expect((screen.getByLabelText("Yazı başlığı") as HTMLInputElement).value).toBe(articles[0].title);
    selectPage(/Ana sayfa/);
    expect(screen.queryByLabelText("Yazı başlığı")).toBeNull();
  });
  it("edits series beside its canvas and preserves saved links during slug edits", () => {
    render(<SiteEditor />);
    selectPage(initialSeries[0].title);
    message({ type: previewEvents.select, id: "meta" });
    fireEvent.change(screen.getByLabelText("Kalıcı bağlantı adı"), { target: { value: "henuz-kaydedilmedi" } });
    expect(screen.getByRole("link", { name: /Kaydedilmiş sayfayı aç/ }).getAttribute("href")).toBe(`/seriler/${initialSeries[0].slug}`);
    fireEvent.click(screen.getByRole("button", { name: "Değişiklikleri geri al" }));
    message({ type: previewEvents.select, id: "summary" });
    fireEvent.change(screen.getByLabelText("Seri açıklaması"), { target: { value: "Yeni seri açıklaması" } });
    expect(localStorage.getItem(seriesKey)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(JSON.parse(localStorage.getItem(seriesKey)!)[0].summary).toBe("Yeni seri açıklaması");
    expect(screen.getByRole("button", { name: /^Sayfalar:/ })).toBeTruthy();
  });
});
describe("document validation", () => {
  it("rejects corrupt records, unknown routes and unsafe image protocols", () => {
    expect(validateArticle({ ...articles[0], slug: "unsafe/slug" })).toBeNull();
    expect(validateArticle({ ...articles[0], figure: { ...articles[0].figure, src: "javascript:alert(1)" } })).toBeNull();
    expect(validateArticle({ ...articles[0], table: { caption: "", columns: ["a"], rows: [["a", "b"]] } })).toBeNull();
    expect(parseArticles(JSON.stringify([articles[0], articles[0]]))).toBeNull();
    expect(parseStudioTarget({ kind: "article", slug: "invalid slug" })).toBeNull();
    expect(parseDocumentDraft({ kind: "series", series: { ...initialSeries[0], presentation: { heading: "invalid", chapterStyle: "cards" } } })).toBeNull();
  });
});

function selectPage(title: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
  fireEvent.click(screen.getByRole("button", { name: title }));
}
