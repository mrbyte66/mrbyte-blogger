import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "../components/auth/AuthProvider";
import { sessionKey, profilesKey, sessionDuration } from "../lib/auth/model";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedLibraryPage } from "../components/saved/SavedLibraryPage";
import { ArticleCard } from "../components/ArticleCard";
import { SavedProvider as LibraryProvider, useSavedLibrary } from "../components/saved/SavedProvider";
import { SaveArticleButton } from "../components/saved/SaveArticleButton";
import { articles } from "../lib/content";
import { createCollection, deleteCollection, emptyLibrary, parseLibrary, saveArticle, savedKey as baseSavedKey } from "../lib/saved/model";

const savedKey = `${baseSavedKey}:test-member`;
function SavedProvider({ children }: { children: ReactNode }) { return <AuthProvider><LibraryProvider>{children}</LibraryProvider></AuthProvider>; }
beforeEach(() => {
 localStorage.clear();
 const profile = { id: "test-member", name: "Üye", email: "member@example.com", verified: true, googleConnected: false, role: "member" };
 localStorage.setItem(profilesKey, JSON.stringify([profile]));
 localStorage.setItem(sessionKey, JSON.stringify({ version: 1, profile, startedAt: Date.now(), expiresAt: Date.now() + sessionDuration }));
});
afterEach(() => vi.restoreAllMocks());
function Controls() {
  const { library, deleteCategory } = useSavedLibrary();
  const { signOut } = useAuth();
  return <><button onClick={signOut}>Misafir</button><button onClick={() => deleteCategory(library.collections[1]?.id)}>Kategori sil</button></>;
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
  it("migrates the default name without losing records or custom collection references", () => {
    const legacy = { version: 1, collections: [{ id: "saved", name: "Kaydedilenler" }, { id: "general", name: "Genel" }], entries: [{ slug: articles[0].slug, collectionId: "general" }] };
    const migrated = parseLibrary(JSON.stringify(legacy));
    expect(migrated.collections).toEqual([{ id: "saved", name: "Genel" }, { id: "general", name: "Genel (2)" }]);
    expect(migrated.entries).toEqual(legacy.entries);
    expect(parseLibrary(JSON.stringify(migrated))).toEqual(migrated);
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
