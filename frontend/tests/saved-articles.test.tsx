import type { ReactNode } from "react";
import { act, fireEvent, render as baseRender, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { SiteDataValues, type ContentState } from "../components/data/SiteData";
import { EngagementProvider } from "../components/engagement/EngagementProvider";
import { SavedLibraryPage } from "../components/saved/SavedLibraryPage";
import { ArticleCard } from "../components/ArticleCard";
import { SavedProvider } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { createWorkspace } from "../lib/builder/model";
import { articles as fixtures, type Article } from "../lib/content";
import { fakeBackend, settle } from "./support/fake-backend";
import { personalOf } from "./support/fake-member-api";

const articles: Article[] = fixtures.slice(0, 3).map((article, index) => ({ ...article, id: `20000000-0000-4000-8000-00000000000${index + 1}`, status: "published", stats: { views: 0, claps: 0, saves: 0 } }));
let backend: ReturnType<typeof fakeBackend>;

function Site({ children }: { children: ReactNode }) {
  const content: ContentState = { articles, series: [], ready: true, error: null };
  return <SiteDataValues content={content} workspace={{ workspace: createWorkspace(), save: () => false, ready: true, storageError: null }}>
    <AuthProvider><EngagementProvider><SavedProvider>{children}</SavedProvider></EngagementProvider></AuthProvider>
  </SiteDataValues>;
}
async function render(ui: ReactNode) { const result = baseRender(<Site>{ui}</Site>); await act(settle); return result; }
async function click(element: HTMLElement) { await act(async () => { fireEvent.click(element); await settle(); }); }
function SignOut() { const { signOut } = useAuth(); return <button onClick={() => void signOut()}>Çıkış</button>; }
const me = () => personalOf(backend.state.member, "member-1");
const bookmarks = () => me().bookmarks;
const collections = () => me().collections;

beforeEach(() => {
  localStorage.clear();
  backend = fakeBackend({ signedIn: { id: "member-1", name: "Üye", email: "member@example.com" } });
  for (const article of articles) backend.state.member.publicArticles.set(article.id!, { slug: article.slug, stats: { views: 0, claps: 0, saves: 0 } });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("member bookmark controls", () => {
  it("saves to Genel without opening the article, moves, creates collections and removes", async () => {
    const open = vi.fn();
    const { container } = await render(<ArticleCard article={articles[0]} onOpen={open} />);
    await click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(open).not.toHaveBeenCalled();
    expect(container.querySelector("button button")).toBeNull();
    const genel = collections().find((c) => c.isDefault)!;
    expect(genel.name).toBe("Genel");
    expect(bookmarks()).toEqual([expect.objectContaining({ articleId: articles[0].id, collectionId: genel.id })]);
    expect(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }).textContent).toContain("1");

    fireEvent.click(screen.getByRole("button", { name: "Yeni koleksiyon" }));
    expect(document.activeElement).toBe(screen.getByLabelText("Koleksiyon adı"));
    fireEvent.change(screen.getByLabelText("Koleksiyon adı"), { target: { value: "Kişisel gelişim" } });
    await click(screen.getByRole("button", { name: "Oluştur ve taşı" }));
    const custom = collections().find((c) => c.name === "Kişisel gelişim")!;
    expect(bookmarks()[0].collectionId).toBe(custom.id);
    expect(backend.state.calls.find((c) => c.method === "POST" && c.path === "/me/collections")?.headers["Idempotency-Key"]).toBeTruthy();

    await click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    fireEvent.change(screen.getByLabelText("Koleksiyon", { exact: true }), { target: { value: genel.id } });
    expect(bookmarks()[0].collectionId).toBe(custom.id);
    await click(screen.getByRole("button", { name: "Taşı" }));
    expect(bookmarks()[0].collectionId).toBe(genel.id);

    await click(screen.getByRole("button", { name: `Kaydı yönet: ${articles[0].title}` }));
    await click(screen.getByRole("button", { name: "Kaydı kaldır" }));
    expect(bookmarks()).toEqual([]);
    expect(localStorage.length).toBe(0);
  });

  it("reports server failures without pretending the record was saved", async () => {
    await render(<SaveArticleButton slug={articles[0].slug} title={articles[0].title} />);
    backend.state.member.publicArticles.delete(articles[0].id!);
    await click(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }));
    expect(screen.getByRole("alert").textContent).toContain("Bulunamadı");
    expect(bookmarks()).toEqual([]);
    expect(screen.getByRole("button", { name: `Yazıyı kaydet: ${articles[0].title}` }).getAttribute("aria-pressed")).toBe("false");
  });

  it("never allows Studio preview to save and asks guests to sign in", async () => {
    await render(<SaveArticleButton slug={articles[0].slug} title={articles[0].title} preview />);
    expect(screen.queryByRole("button")).toBeNull();
    backend.switchTo(null);
    baseRender(<Site><SaveArticleButton slug={articles[1].slug} title={articles[1].title} /></Site>);
    await act(settle);
    expect(screen.getByRole("button", { name: `Giriş yap ve yazıyı kaydet: ${articles[1].title}` })).toBeTruthy();
    expect(backend.state.calls.filter((c) => c.path.startsWith("/me/bookmarks") && c.method !== "GET")).toEqual([]);
  });
});

describe("library page", () => {
  it("lists, searches and sorts saved writing; signing out hides everything", async () => {
    me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 }, { id: "c-private", name: "Özel koleksiyon", isDefault: false, version: 0 });
    me().bookmarks.push(
      { articleId: articles[1].id!, collectionId: "c-private", savedAt: "2026-10-01T10:00:00Z", version: 0 },
      { articleId: articles[0].id!, collectionId: "c-default", savedAt: "2026-10-02T10:00:00Z", version: 0 });
    const { container } = await render(<><SavedLibraryPage /><SignOut /></>);
    expect(screen.getByRole("button", { name: "Özel koleksiyon 1" })).toBeTruthy();
    const order = () => Array.from(container.querySelectorAll(".saved-item .article-card-title")).map((el) => el.textContent);
    expect(order()).toEqual([articles[1].title, articles[0].title]);
    fireEvent.change(screen.getByLabelText("Sıralama"), { target: { value: "title" } });
    expect(order()).toEqual([articles[0].title, articles[1].title].sort((a, b) => a.localeCompare(b, "tr")));
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: "no-match-1234" } });
    expect(screen.getByRole("heading", { name: "Aradığın satır henüz burada değil." })).toBeTruthy();
    await click(screen.getByRole("button", { name: "Çıkış" }));
    expect(screen.queryByRole("button", { name: "Özel koleksiyon 1" })).toBeNull();
    expect(screen.queryByText(articles[0].title)).toBeNull();
  });

  it("keeps hidden writing as an anonymous record that can be removed", async () => {
    me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 });
    me().bookmarks.push({ articleId: articles[2].id!, collectionId: "c-default", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    backend.state.member.publicArticles.delete(articles[2].id!);
    await render(<SavedLibraryPage />);
    expect(screen.getByRole("heading", { name: "Yazı şu anda erişilemiyor" })).toBeTruthy();
    expect(screen.queryByText(articles[2].title)).toBeNull();
    await click(screen.getByRole("button", { name: "Kaydı kaldır" }));
    expect(bookmarks()).toEqual([]);
  });

  it("renames and deletes a custom collection; its writing returns to Genel", async () => {
    me().collections.push({ id: "c-default", name: "Genel", isDefault: true, version: 0 }, { id: "c-old", name: "Eski ad", isDefault: false, version: 0 });
    me().bookmarks.push({ articleId: articles[0].id!, collectionId: "c-old", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    await render(<SavedLibraryPage />);
    fireEvent.click(screen.getByRole("button", { name: "Eski ad 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Koleksiyonu düzenle" }));
    fireEvent.change(screen.getByLabelText("Koleksiyon adı"), { target: { value: "Yeni ad" } });
    await click(screen.getByRole("button", { name: "Kaydet" }));
    expect(collections().find((c) => c.id === "c-old")?.name).toBe("Yeni ad");
    fireEvent.click(screen.getByRole("button", { name: "Yeni ad 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Koleksiyonu düzenle" }));
    await click(screen.getByRole("button", { name: "Koleksiyonu kaldır" }));
    expect(collections().map((c) => c.id)).toEqual(["c-default"]);
    expect(bookmarks()[0].collectionId).toBe("c-default");
  });
});

describe("account change (#5)", () => {
  it.each(["account-switch", "logout-and-return"])("clears private library drafts and filters on %s", async (transition) => {
    me().collections.push({ id: "alice-default", name: "Genel", isDefault: true, version: 0 }, { id: "alice-private", name: "Alice özel koleksiyonu", isDefault: false, version: 0 });
    me().bookmarks.push({ articleId: articles[0].id!, collectionId: "alice-private", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    const bob = personalOf(backend.state.member, "bob-member");
    bob.collections.push({ id: "bob-default", name: "Genel", isDefault: true, version: 0 });
    bob.bookmarks.push({ articleId: articles[1].id!, collectionId: "bob-default", savedAt: "2026-10-02T10:00:00Z", version: 0 });
    await render(<><SavedLibraryPage /><SignOut /></>);
    fireEvent.click(screen.getByRole("button", { name: "Alice özel koleksiyonu 1" }));
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: articles[0].title } });
    fireEvent.change(screen.getByLabelText("Sıralama"), { target: { value: "title" } });
    fireEvent.click(screen.getByRole("button", { name: "Koleksiyonu düzenle" }));
    expect(screen.getByLabelText("Koleksiyon adı")).toHaveProperty("value", "Alice özel koleksiyonu");
    if (transition === "logout-and-return") {
      await click(screen.getByRole("button", { name: "Çıkış" }));
      expect(screen.queryByLabelText("Koleksiyon adı")).toBeNull();
      backend.switchTo({ id: "member-1", name: "Üye", email: "member@example.com" });
    } else {
      backend.switchTo({ id: "bob-member", name: "Bob", email: "bob@example.com" });
    }
    // The session changed in another tab/device: AuthProvider re-reads it on focus.
    await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
    const expected = transition === "account-switch" ? articles[1] : articles[0];
    expect(screen.getByText(expected.title)).toBeTruthy();
    expect(screen.queryByLabelText("Koleksiyon adı")).toBeNull();
    expect(screen.getByLabelText("Kitaplıkta ara")).toHaveProperty("value", "");
    expect(screen.getByLabelText("Sıralama")).toHaveProperty("value", "saved");
    expect(screen.getByRole("button", { name: "Tümü 1" }).getAttribute("aria-pressed")).toBe("true");
    expect(me().bookmarks).toHaveLength(1);
    expect(bob.bookmarks).toHaveLength(1);
  });

  it("keeps the library tools when the same account's profile changes", async () => {
    me().collections.push({ id: "alice-default", name: "Genel", isDefault: true, version: 0 });
    me().bookmarks.push({ articleId: articles[0].id!, collectionId: "alice-default", savedAt: "2026-10-01T10:00:00Z", version: 0 });
    await render(<SavedLibraryPage />);
    fireEvent.change(screen.getByLabelText("Kitaplıkta ara"), { target: { value: "arama" } });
    backend.switchTo({ id: "member-1", name: "Yeni ad", email: "member@example.com" });
    await act(async () => { window.dispatchEvent(new Event("focus")); await settle(); });
    expect(screen.getByLabelText("Kitaplıkta ara")).toHaveProperty("value", "arama");
  });
});
