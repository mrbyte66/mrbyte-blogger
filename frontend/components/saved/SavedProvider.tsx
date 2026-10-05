"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { createCollection, defaultCollectionId, deleteCollection, emptyLibrary, parseLibrary, saveArticle, savedKey, type SavedLibrary } from "../../lib/saved/model";

type MemberLibrary = { library: SavedLibrary; ready: boolean; member: boolean; error: string; importLegacy: () => boolean; save: (slug: string, collectionId?: string) => boolean; remove: (slug: string) => boolean; create: (name: string, slug?: string) => boolean; rename: (id: string, name: string) => boolean; deleteCategory: (id: string) => boolean };
const fallback: MemberLibrary = { library: emptyLibrary(), ready: false, member: false, error: "", importLegacy: () => false, save: () => false, remove: () => false, create: () => false, rename: () => false, deleteCategory: () => false };
const Context = createContext<MemberLibrary>(fallback);
export function SavedProvider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState(emptyLibrary);
  const [ready, setReady] = useState(false);
  const { session, ready: authReady } = useAuth();
  const member = !!session;
  const ownerId = session?.profile.id ?? null;
  const storageKey = ownerId ? `${savedKey}:${ownerId}` : null;
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    function load() {
      try { setLibrary(storageKey ? parseLibrary(localStorage.getItem(storageKey)) : emptyLibrary()); setError(""); }
      catch { setLibrary(emptyLibrary()); setError("Kitaplık okunamadı. Mevcut kayıt değiştirilmedi."); }
      setLoadedId(ownerId); setReady(authReady);
    }
    function sync(event: StorageEvent) { if (event.key === storageKey || event.key === null) load(); }
    load(); window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [storageKey, ownerId, authReady]);
  function change(update: (current: SavedLibrary) => SavedLibrary): boolean {
    if (!ready || !member || !storageKey || loadedId !== ownerId) return false;
    try {
      const next = parseLibrary(JSON.stringify(update(parseLibrary(localStorage.getItem(storageKey)))));
      localStorage.setItem(storageKey, JSON.stringify(next)); setLibrary(next); setError(""); return true;
    } catch (cause) { setError(cause instanceof Error && !(cause instanceof DOMException) && !(cause instanceof SyntaxError) && !cause.message.startsWith("Invalid") ? cause.message : "Kaydedilemedi. Mevcut kayıt değiştirilmedi."); return false; }
  }
  const value: MemberLibrary = { library: member && loadedId === ownerId ? library : emptyLibrary(), ready: authReady && ready && loadedId === ownerId, member, error,
    importLegacy: () => change((current) => { if (current.entries.length || current.collections.length > 1) throw new Error("İçe aktarmak için kitaplığın boş olmalı."); return parseLibrary(localStorage.getItem(savedKey)); }),
    save: (slug, collectionId = defaultCollectionId) => change((current) => saveArticle(current, slug, collectionId)),
    remove: (slug) => change((current) => ({ ...current, entries: current.entries.filter((entry) => entry.slug !== slug) })),
    create: (name, slug) => change((current) => { const id = crypto.randomUUID(); const next = createCollection(current, name, id); return slug ? saveArticle(next, slug, id) : next; }),
    rename: (id, name) => change((current) => { if (id === defaultCollectionId) throw new Error("Varsayılan koleksiyon yeniden adlandırılamaz."); const base = { ...current, collections: current.collections.filter((collection) => collection.id !== id) }; const created = createCollection({ ...base, entries: [] }, name, id); return { ...created, entries: current.entries }; }),
    deleteCategory: (id) => change((current) => deleteCollection(current, id)),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSavedLibrary() { return useContext(Context); }
