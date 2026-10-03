import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedLibraryPage } from "../components/saved/SavedLibraryPage";
import { ArticleCard } from "../components/ArticleCard";
import { SavedProvider, useSavedLibrary } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { articles } from "../lib/content";
import { createCollection, deleteCollection, emptyLibrary, parseLibrary, saveArticle, savedKey } from "../lib/saved/model";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
function Controls() {
  const { setMember, library, deleteCategory } = useSavedLibrary();
  return <><button onClick={() => setMember(false)}>Misafir</button><button onClick={() => deleteCategory(library.collections[1]?.id)}>Kategori sil</button></>;
}
describe("private member collection model", () => {
  it("uses one record per article and moves deleted categories to the default", () => {
    const initial = saveArticle(emptyLibrary(), articles[0].slug);
    const categorized = saveArticle(createCollection(initial, "Türk edebiyatı", "literature"), articles[0].slug, "literature");
    expect(categorized.entries).toEqual([{ slug: articles[0].slug, collectionId: "literature" }]);
    expect(deleteCollection(categorized, "literature").entries).toEqual(initial.entries);
    expect(() => deleteCollection(initial, "saved")).toThrow();
    expect(() => createCollection(categorized, "TÜRK EDEBİYATI", "other")).toThrow();
  });
  it("preserves card order when moving an existing record", () => {
    let library = saveArticle(saveArticle(emptyLibrary(), articles[0].slug), articles[1].slug);
    library = createCollection(library, "Yapay Zeka", "ai");
    const moved = saveArticle(library, articles[0].slug, "ai");
    expect(moved.entries.map((entry) => entry.slug)).toEqual(library.entries.map((entry) => entry.slug));
  });
  it("rejects duplicate entries and orphan categories", () => {
    const saved = saveArticle(emptyLibrary(), articles[0].slug);
    expect(() => parseLibrary(JSON.stringify({ ...saved, entries: [...saved.entries, ...saved.entries] }))).toThrow();
    expect(() => parseLibrary(JSON.stringify({ ...saved, entries: [{ slug: articles[0].slug, collectionId: "missing" }] }))).toThrow();
  });
});
describe("member bookmark controls", () => {
  it("saves without opening the article, persists categories and supports removal", async () => {
    const open = vi.fn();
    const { container, unmount } = render(<SavedProvider><ArticleCard article={articles[0]} onOpen={open} /></SavedProvider>);
    fireEvent.click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(open).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
    expect(JSON.parse(localStorage.getItem(savedKey)!).entries[0].collectionId).toBe("saved");
    fireEvent.change(screen.getByLabelText("Yeni kategori"), { target: { value: "Kişisel gelişim" } });
    fireEvent.click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
    const data = parseLibrary(localStorage.getItem(savedKey));
    expect(data.entries).toHaveLength(1);
    expect(data.collections[1].name).toBe("Kişisel gelişim");
    expect(data.entries[0].collectionId).toBe(data.collections[1].id);
    fireEvent.click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    fireEvent.change(screen.getByLabelText("Kategori", { exact: true }), { target: { value: "saved" } });
    expect(parseLibrary(localStorage.getItem(savedKey)).entries[0].collectionId).toBe(data.collections[1].id);
    fireEvent.click(screen.getByRole("button", { name: "Taşı" }));
    expect(parseLibrary(localStorage.getItem(savedKey)).entries[0].collectionId).toBe("saved");
    unmount();
    render(<SavedProvider><SaveArticleButton slug={articles[0].slug} title={articles[0].title} /><Controls /></SavedProvider>);
    await waitFor(() => expect(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Kategori sil" }));
    expect(parseLibrary(localStorage.getItem(savedKey)).entries[0].collectionId).toBe("saved");
    fireEvent.click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydı kaldır" }));
    expect(parseLibrary(localStorage.getItem(savedKey)).entries).toEqual([]);
    fireEvent.click(screen.getByRole("button", { name: "Misafir" }));
    expect(screen.queryByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` })).toBeNull();
    expect(screen.getByLabelText("0 kaydetme")).toBeTruthy();
  });
  it("preserves malformed data and reports write failures", () => {
    localStorage.setItem(savedKey, "broken");
    render(<SavedProvider><SaveArticleButton slug={articles[0].slug} title={articles[0].title} /></SavedProvider>);
    fireEvent.click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(localStorage.getItem(savedKey)).toBe("broken");
    expect(screen.getByRole("alert")).toBeTruthy();
    act(() => { localStorage.removeItem(savedKey); window.dispatchEvent(new StorageEvent("storage", { key: savedKey })); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("quota", "QuotaExceededError"); });
    fireEvent.change(screen.getByLabelText("Yeni kategori"), { target: { value: "Başka kategori" } });
    fireEvent.click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
    expect(screen.getByRole("alert").textContent).toContain("Kaydedilemedi");
    expect(localStorage.getItem(savedKey)).toBeNull();
  });
  it("never allows Studio preview to save", () => {
    render(<SavedProvider><SaveArticleButton slug={articles[0].slug} title={articles[0].title} preview /></SavedProvider>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(localStorage.getItem(savedKey)).toBeNull();
  });
});


describe("private library guest preview", () => {
  it("hides saved articles and collection names when membership preview is disabled", () => {
    localStorage.setItem(savedKey, JSON.stringify(saveArticle(createCollection(emptyLibrary(), "Özel kategori", "private"), articles[0].slug, "private")));
    render(<SavedProvider><SavedLibraryPage /></SavedProvider>);
    expect(screen.getByRole("button", { name: "Özel kategori 1" })).toBeTruthy();
    fireEvent.click(screen.getByText("Önizleme hakkında"));
    fireEvent.click(screen.getByLabelText("Üye görünümünü göster"));
    expect(screen.queryByRole("button", { name: "Özel kategori 1" })).toBeNull();
    expect(screen.queryByText(articles[0].title)).toBeNull();
    expect(parseLibrary(localStorage.getItem(savedKey)).entries).toHaveLength(1);
  });
});
