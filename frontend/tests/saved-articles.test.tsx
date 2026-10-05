import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { fakeBackend, settle } from "./support/fake-backend";
import { MemorySite, siteWrapper } from "./support/memory-site";
import { act, fireEvent, render as baseRender, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedLibraryPage } from "../components/saved/SavedLibraryPage";
import { ArticleCard } from "../components/ArticleCard";
import { SavedProvider as LibraryProvider, useSavedLibrary } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { articles } from "../lib/content";
import { createCollection, deleteCollection, emptyLibrary, parseLibrary, saveArticle, savedKey as baseSavedKey } from "../lib/saved/model";

const savedKey = `${baseSavedKey}:test-member`;
const Site = siteWrapper(new MemorySite());
function SavedProvider({ children }: { children: ReactNode }) { return <Site><AuthProvider><LibraryProvider>{children}</LibraryProvider></AuthProvider></Site>; }
/** Renders and waits until the server session (fake backend) has been read. */
async function render(ui: React.ReactElement) { const result = baseRender(ui); await act(settle); return result; }
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); await settle(); }); }
beforeEach(() => {
 localStorage.clear();
 fakeBackend({ signedIn: { id: "test-member", name: "Üye", email: "member@example.com" } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Controls() {
  const { library, deleteCategory } = useSavedLibrary();
  const { signOut } = useAuth();
  return <><button onClick={() => void signOut()}>Misafir</button><button onClick={() => deleteCategory(library.collections[1]?.id)}>Kategori sil</button></>;
}
describe("private member collection model", () => {
  it("uses one record per article and moves deleted categories to the default", async () => {
    const initial = saveArticle(emptyLibrary(), articles[0].slug);
    const categorized = saveArticle(createCollection(initial, "Türk edebiyatı", "literature"), articles[0].slug, "literature");
    expect(categorized.entries).toEqual([{ slug: articles[0].slug, collectionId: "literature" }]);
    expect(deleteCollection(categorized, "literature").entries).toEqual(initial.entries);
    expect(() => deleteCollection(initial, "saved")).toThrow();
    expect(() => createCollection(categorized, "TÜRK EDEBİYATI", "other")).toThrow();
  });
  it("migrates the default name without losing records or custom collection references", async () => {
    const legacy = { version: 1, collections: [{ id: "saved", name: "Kaydedilenler" }, { id: "general", name: "Genel" }], entries: [{ slug: articles[0].slug, collectionId: "general" }] };
    const migrated = parseLibrary(JSON.stringify(legacy));
    expect(migrated.collections).toEqual([{ id: "saved", name: "Genel" }, { id: "general", name: "Genel (2)" }]);
    expect(migrated.entries).toEqual(legacy.entries);
    expect(parseLibrary(JSON.stringify(migrated))).toEqual(migrated);
  });
  it("preserves card order when moving an existing record", async () => {
    let library = saveArticle(saveArticle(emptyLibrary(), articles[0].slug), articles[1].slug);
    library = createCollection(library, "Yapay Zeka", "ai");
    const moved = saveArticle(library, articles[0].slug, "ai");
    expect(moved.entries.map((entry) => entry.slug)).toEqual(library.entries.map((entry) => entry.slug));
  });
  it("rejects duplicate entries and orphan categories", async () => {
    const saved = saveArticle(emptyLibrary(), articles[0].slug);
    expect(() => parseLibrary(JSON.stringify({ ...saved, entries: [...saved.entries, ...saved.entries] }))).toThrow();
    expect(() => parseLibrary(JSON.stringify({ ...saved, entries: [{ slug: articles[0].slug, collectionId: "missing" }] }))).toThrow();
  });
});
describe("member bookmark controls", () => {
  it("saves without opening the article, persists categories and supports removal", async () => {
    const open = vi.fn();
    const { container, unmount } = await render(<SavedProvider><ArticleCard article={articles[0]} onOpen={open} /></SavedProvider>);
    fireEvent.click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(open).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
    expect(JSON.parse(localStorage.getItem(savedKey)!).entries[0].collectionId).toBe("saved");
    expect(screen.queryByLabelText("Koleksiyon adı")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Koleksiyon adı"));
    fireEvent.change(screen.getByLabelText("Koleksiyon adı"), { target: { value: "Kişisel gelişim" } });
    fireEvent.click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
    const data = parseLibrary(localStorage.getItem(savedKey));
    expect(data.entries).toHaveLength(1);
    expect(data.collections[1].name).toBe("Kişisel gelişim");
    expect(data.entries[0].collectionId).toBe(data.collections[1].id);
    fireEvent.click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    fireEvent.change(screen.getByLabelText("Koleksiyon", { exact: true }), { target: { value: "saved" } });
    expect(parseLibrary(localStorage.getItem(savedKey)).entries[0].collectionId).toBe(data.collections[1].id);
    fireEvent.click(screen.getByRole("button", { name: "Taşı" }));
    expect(parseLibrary(localStorage.getItem(savedKey)).entries[0].collectionId).toBe("saved");
    unmount();
    await render(<SavedProvider><SaveArticleButton slug={articles[0].slug} title={articles[0].title} /><Controls /></SavedProvider>);
    await waitFor(() => expect(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` })).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: "Kategori sil" }));
    expect(parseLibrary(localStorage.getItem(savedKey)).entries[0].collectionId).toBe("saved");
    fireEvent.click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    fireEvent.click(screen.getByRole("button", { name: "Kaydı kaldır" }));
    expect(parseLibrary(localStorage.getItem(savedKey)).entries).toEqual([]);
    await click(screen.getByRole("button", { name: "Misafir" }));
    expect(screen.queryByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` })).toBeNull();
    expect(screen.getByRole("button", { name: `Giriş yap ve yazıyı kaydet: ${articles[0].title}` })).toBeTruthy();
  });
  it("preserves malformed data and reports write failures", async () => {
    localStorage.setItem(savedKey, "broken");
    await render(<SavedProvider><SaveArticleButton slug={articles[0].slug} title={articles[0].title} /></SavedProvider>);
    fireEvent.click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(localStorage.getItem(savedKey)).toBe("broken");
    expect(screen.getByRole("alert")).toBeTruthy();
    act(() => { localStorage.removeItem(savedKey); window.dispatchEvent(new StorageEvent("storage", { key: savedKey })); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("quota", "QuotaExceededError"); });
    fireEvent.click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
    fireEvent.change(screen.getByLabelText("Koleksiyon adı"), { target: { value: "Başka kategori" } });
    fireEvent.click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
    expect(screen.getByRole("alert").textContent).toContain("Kaydedilemedi");
    expect(localStorage.getItem(savedKey)).toBeNull();
  });
  it("never allows Studio preview to save", async () => {
    await render(<SavedProvider><SaveArticleButton slug={articles[0].slug} title={articles[0].title} preview /></SavedProvider>);
    expect(screen.queryByRole("button")).toBeNull();
    expect(localStorage.getItem(savedKey)).toBeNull();
  });
});


describe("private library guest preview", () => {
  it("hides saved articles and collection names when membership preview is disabled", async () => {
    localStorage.setItem(savedKey, JSON.stringify(saveArticle(createCollection(emptyLibrary(), "Özel kategori", "private"), articles[0].slug, "private")));
    await render(<SavedProvider><SavedLibraryPage /><Controls /></SavedProvider>);
    expect(screen.getByRole("button", { name: "Özel kategori 1" })).toBeTruthy();
    await click(screen.getByRole("button", { name: "Misafir" }));
    expect(screen.queryByRole("button", { name: "Özel kategori 1" })).toBeNull();
    expect(screen.queryByText(articles[0].title)).toBeNull();
    expect(parseLibrary(localStorage.getItem(savedKey)).entries).toHaveLength(1);
  });
});

it("searches the member library and sorts explicitly without changing stored order", async () => {
 const library = saveArticle(saveArticle(emptyLibrary(), articles[0].slug), articles[1].slug);
 localStorage.setItem(savedKey, JSON.stringify(library));
 const { container } = await render(<SavedProvider><SavedLibraryPage /></SavedProvider>);
 fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: articles[0].title } });
 expect(container.querySelectorAll(".saved-item")).toHaveLength(1);
 fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: "no-match-1234" } });
 expect(screen.getByRole("heading", { name: "Aradığın satır henüz burada değil." })).toBeTruthy();
 fireEvent.click(screen.getByRole("button", { name: "Aramayı temizle" }));
 fireEvent.change(screen.getByLabelText("Sıralama"), { target: { value: "title" } });
 const titles = Array.from(container.querySelectorAll(".saved-item .article-card-title")).map(el => el.textContent);
 expect(titles).toEqual([articles[0].title, articles[1].title].sort((a,b) => a.localeCompare(b,"tr")));
 expect(parseLibrary(localStorage.getItem(savedKey)).entries).toEqual(library.entries);
});
