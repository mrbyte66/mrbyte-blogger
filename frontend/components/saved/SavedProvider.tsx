"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useContent } from "../data/SiteData";
import { useEngagement } from "../engagement/EngagementProvider";
import { allPages, api, describe } from "../../lib/api/http";

/**
 * The signed-in member's private library, stored on the server (API contract §5). Nothing is kept
 * in browser storage; another account's records are never loaded. Signing out clears the state.
 */
export type SavedCollection = { id: string; name: string; isDefault: boolean; count: number; version: number };
export type SavedEntry = { articleId: string; slug?: string; collectionId: string; savedAt: string; version: number; available: boolean };
export type SavedLibrary = { collections: SavedCollection[]; entries: SavedEntry[] };
type BookmarkDto = { articleId: string; collectionId: string; savedAt: string; version: number; available: boolean; article?: { slug: string } };
type MemberLibrary = {
  library: SavedLibrary; defaultId: string; ready: boolean; member: boolean; error: string;
  entryFor: (slug: string) => SavedEntry | undefined;
  save: (slug: string, collectionId?: string) => Promise<boolean>;
  remove: (slugOrArticleId: string) => Promise<boolean>;
  create: (name: string, slug?: string) => Promise<boolean>;
  rename: (id: string, name: string) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
};
const empty: SavedLibrary = { collections: [], entries: [] };
const no = async () => false;
const fallback: MemberLibrary = { library: empty, defaultId: "", ready: false, member: false, error: "", entryFor: () => undefined, save: no, remove: no, create: no, rename: no, deleteCategory: no };
const Context = createContext<MemberLibrary>(fallback);

export function SavedProvider({ children }: { children: ReactNode }) {
  const { session, ready: authReady } = useAuth();
  const { articles } = useContent();
  const { refreshStats } = useEngagement();
  const member = !!session?.profile.verified;
  const userId = member ? session!.profile.id : null;
  const [library, setLibrary] = useState<SavedLibrary>(empty);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = ++generation.current;
    if (!userId) { setLibrary(empty); setLoadedFor(null); return; }
    try {
      const [collections, bookmarks] = await Promise.all([
        api<{ items: SavedCollection[] }>("GET", "/me/collections"), allPages<BookmarkDto>("/me/bookmarks?sort=saved_asc"),
      ]);
      if (current !== generation.current) return;
      setLibrary({ collections: collections.data.items, entries: bookmarks.map(({ article, ...entry }) => ({ ...entry, ...(article ? { slug: article.slug } : {}) })) });
      setLoadedFor(userId);
    } catch (cause) {
      if (current === generation.current) { setLibrary(empty); setLoadedFor(userId); setError(describe(cause)); }
    }
  }, [userId]);
  useEffect(() => { setError(""); void load(); }, [load]);
  // Another tab or device may have changed the library: re-read on focus.
  useEffect(() => {
    if (!userId) return;
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    window.addEventListener("focus", visible); document.addEventListener("visibilitychange", visible);
    return () => { window.removeEventListener("focus", visible); document.removeEventListener("visibilitychange", visible); };
  }, [userId, load]);

  const ready = authReady && (!member || loadedFor === userId);
  const visible = member && loadedFor === userId ? library : empty;
  const defaultId = visible.collections.find((c) => c.isDefault)?.id ?? "";
  const idOf = (slug: string) => articles.find((article) => article.slug === slug)?.id ?? visible.entries.find((entry) => entry.slug === slug)?.articleId;

  async function run(task: () => Promise<unknown>, articleId?: string): Promise<boolean> {
    if (!member || !ready) return false;
    try { await task(); setError(""); return true; }
    catch (cause) { setError(describe(cause)); return false; }
    finally { await load(); if (articleId) refreshStats(articleId); }
  }
  const value: MemberLibrary = {
    library: visible, defaultId, ready, member, error,
    entryFor: (slug) => visible.entries.find((entry) => entry.slug === slug),
    save: (slug, collectionId) => {
      const id = idOf(slug);
      if (!id) return Promise.resolve(false);
      return run(() => api("PUT", `/me/bookmarks/${id}`, { body: collectionId ? { collectionId } : {} }), id);
    },
    remove: (key) => {
      const id = idOf(key) ?? key;
      return run(() => api("DELETE", `/me/bookmarks/${id}`), id);
    },
    create: (name, slug) => run(async () => {
      const { data } = await api<SavedCollection>("POST", "/me/collections", { body: { name: name.trim() }, idempotent: true });
      const id = slug ? idOf(slug) : undefined;
      if (id) { await api("PUT", `/me/bookmarks/${id}`, { body: { collectionId: data.id } }); refreshStats(id); }
    }),
    rename: (id, name) => run(() => api("PATCH", `/me/collections/${id}`, { body: { name: name.trim() }, ifMatch: visible.collections.find((c) => c.id === id)?.version ?? 0 })),
    deleteCategory: (id) => run(() => api("DELETE", `/me/collections/${id}`, { ifMatch: visible.collections.find((c) => c.id === id)?.version ?? 0 })),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSavedLibrary() { return useContext(Context); }
