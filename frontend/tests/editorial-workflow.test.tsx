import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SiteEditor } from "../components/builder/SiteEditor";
import { ArticlePage } from "../components/builder/ArticlePage";
import { createArticle } from "../lib/articles/model";
import { useContentWorkspace } from "../lib/editorial/use-content-workspace";
import { contentKey, initialContent, publicArticles, publicSeries, readContent, saveArticleRecord, writeContent } from "../lib/editorial/store";
import { articles } from "../lib/content";
import { initialSeries } from "../lib/series/model";
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
function action(name: string) { fireEvent.click(screen.getByLabelText("İçerik işlemleri")); fireEvent.click(screen.getByText(name)); }

describe("article-first editorial workflow", () => {
  it("saves an empty writing draft, connects an existing series and publishes it later", () => {
    render(<SiteEditor />); newWriting();
    fireEvent.change(screen.getByLabelText("Yazı başlığı"), { target: { value: "Yeni bölüm" } });
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: initialSeries[0].id } });
    fireEvent.click(screen.getByRole("button", { name: /Sayfayı kaydet/ }));
    expect(readContent().articles[0]).toMatchObject({ slug: "yeni-bolum", status: "draft" });
    expect(readContent().series[0].articleSlugs).toContain("yeni-bolum");
    expect(publicArticles(readContent().articles).some((a) => a.slug === "yeni-bolum")).toBe(false);
    expect(publicSeries(readContent().series, readContent().articles)[0].articleSlugs).not.toContain("yeni-bolum");
    fireEvent.click(screen.getByRole("button", { name: "Metin ve paragraflar" }));
    fireEvent.change(screen.getByLabelText("Paragraf 1"), { target: { value: "İlk bölümün metni." } });
    action("Yayına al");
    expect(publicSeries(readContent().series, readContent().articles)[0].articleSlugs).toContain("yeni-bolum");
  });
  it("saves an inline series with its cover and binds the current writing as its first chapter", () => {
    render(<SiteEditor />); newWriting();
    fireEvent.change(screen.getByLabelText("Yazının serisi"), { target: { value: "new" } });
    fireEvent.change(screen.getByLabelText("Yeni seri başlığı"), { target: { value: "Yeni ufuklar" } });
    fireEvent.change(screen.getByLabelText("Yeni seri kapak görseli"), { target: { value: "/assets/cover.svg" } });
    fireEvent.click(screen.getByRole("button", { name: "Seriyi kaydet" }));
    const savedSeries = readContent().series.at(-1)!;
    expect(savedSeries).toMatchObject({ title: "Yeni ufuklar", coverImage: "/assets/cover.svg", status: "draft" });
    expect((screen.getByLabelText("Yazının serisi") as HTMLSelectElement).value).toBe(savedSeries.id);
    expect(screen.queryByLabelText("Yeni seri başlığı")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Metin ve paragraflar" }));
    fireEvent.change(screen.getByLabelText("Paragraf 1"), { target: { value: "İlk yazı." } });
    action("Yayına al");
    expect(readContent().series.at(-1)).toMatchObject({ status: "published", articleSlugs: [readContent().articles[0].slug] });
  });
  it("archives, trashes and restores a writing while keeping its text and membership", () => {
    const writer = renderHook(useContentWorkspace);
    act(() => { writer.result.current.mutate((current) => saveArticleRecord(current, { ...articles[0], status: "archived" }, false)); });
    expect(publicArticles(writer.result.current.articles)).not.toContainEqual(expect.objectContaining({ slug: articles[0].slug }));
    act(() => { writer.result.current.mutate((current) => saveArticleRecord(current, { ...articles[0], status: "trashed" }, false)); });
    expect(writer.result.current.series[0].articleSlugs).toContain(articles[0].slug);
    const page = render(<ArticlePage article={articles[0]} />);
    expect(screen.getByRole("heading", { name: "Yazı bulunamadı" })).toBeTruthy();
    page.unmount();
    act(() => { writer.result.current.mutate((current) => saveArticleRecord(current, { ...articles[0], status: "published" }, false)); });
    expect(publicArticles(writer.result.current.articles)).toContainEqual(expect.objectContaining({ slug: articles[0].slug, paragraphs: articles[0].paragraphs }));
  });
  it("archives a series without hiding or deleting its independent articles, then restores it", () => {
    render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.click(screen.getByRole("button", { name: initialSeries[0].title }));
    action("Arşivle");
    expect(readContent().series[0].status).toBe("archived");
    expect(publicSeries(readContent().series, readContent().articles).some((s) => s.id === initialSeries[0].id)).toBe(false);
    expect(publicArticles(readContent().articles)).toHaveLength(articles.length);
    action("Taslağa geri yükle");
    action("Yayına al");
    expect(readContent().series[0].status).toBe("published");
    expect(readContent().series[0].articleSlugs).toEqual(initialSeries[0].articleSlugs);
  });
  it("keeps both article content and membership unchanged on a failed atomic write", () => {
    const record = { ...createArticle(), title: "New", paragraphs: ["Body"] };
    const previous = readContent();
    const next = saveArticleRecord(previous, record, true, initialSeries[0].id);
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(() => writeContent(next, previous)).toThrow("quota");
    spy.mockRestore();
    expect(localStorage.getItem(contentKey)).toBeNull();
    expect(readContent()).toEqual(initialContent);
  });
  it("shows series before writing and exposes archived and trashed records for recovery", () => {
    const editor = render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    const menu = screen.getByRole("navigation", { name: "Sayfalar" });
    const groups = within(menu).getAllByRole("region");
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual(["Seriler", "Yazılar"]);
    expect(within(menu).queryByRole("button", { name: /Yeni seri/ })).toBeNull();
    editor.unmount();
    writeContent({ ...initialContent, articles: initialContent.articles.map((a, i) => i === 0 ? { ...a, status: "trashed" } : a) }, initialContent);
    render(<SiteEditor />);
    fireEvent.click(screen.getByRole("button", { name: /^Sayfalar:/ }));
    fireEvent.change(screen.getByLabelText("İçerik görünümü"), { target: { value: "trashed" } });
    fireEvent.click(screen.getByRole("button", { name: /Yapay zekâ ile düşünmek/ }));
    action("Taslağa geri yükle");
    expect(readContent().articles.find((a) => a.slug === articles[0].slug)?.status).toBe("draft");
  });
});
