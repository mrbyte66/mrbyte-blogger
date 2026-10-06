"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../auth/AuthProvider";
import { defaultCollectionId, emptyLibrary, type SavedLibrary } from "../../lib/saved/model";
import { articleFromApi, type PublicArticle } from "../../lib/api/content";
import type { Article } from "../../lib/content";
import { update } from "../../lib/api/reactions";
import { api } from "../../lib/api/client";

type Collection = { id: string; name: string; isDefault: boolean; version: number };
type Bookmark = { articleId: string; collectionId: string; available: boolean; article: PublicArticle | null };
type MemberLibrary = { library: SavedLibrary; articles: Article[]; ready: boolean; member: boolean; error: string; save: (slug: string, collectionId?: string) => Promise<boolean>; remove: (slug: string) => Promise<boolean>; create: (name: string, slug?: string) => Promise<boolean>; rename: (id: string, name: string) => Promise<boolean>; deleteCategory: (id: string) => Promise<boolean> };
const fallback: MemberLibrary = { library: emptyLibrary(), articles: [], ready: false, member: false, error: "", save: async () => false, remove: async () => false, create: async () => false, rename: async () => false, deleteCategory: async () => false };
const Context = createContext<MemberLibrary>(fallback);
export function SavedProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(); const ownerId = auth.session?.profile.verified ? auth.session.profile.id : null;
  const [library, setLibrary] = useState(emptyLibrary); const [ready, setReady] = useState(false); const [loadedId, setLoadedId] = useState<string | null>(null); const [error, setError] = useState("");
  const requestVersion=useRef(0);
  const collections = useRef<Collection[]>([]); const bookmarks = useRef<Bookmark[]>([]); const identity = useRef(ownerId); identity.current = ownerId;
  const load = useCallback(async (signal?: AbortSignal) => {
    const request=++requestVersion.current;
    if(!ownerId) { setLibrary(emptyLibrary()); setReady(auth.ready); setLoadedId(null); return; }
    const [categories, saved] = await Promise.all([api<{ items: Collection[] }>("/me/collections", { signal }), api<{ items: Bookmark[]; totalElements: number }>("/me/bookmarks?size=50&sort=saved_asc", { signal })]);
    const entries = [...saved.items];
    for(let page = 1; entries.length < saved.totalElements && entries.length < 1000; page++) {
      const next = await api<{ items: Bookmark[] }>(`/me/bookmarks?size=50&sort=saved_asc&page=${page}`, { signal }); if(!next.items.length) break; entries.push(...next.items);
    }
    if(signal?.aborted || identity.current !== ownerId || request!==requestVersion.current) return;
    collections.current = categories.items; bookmarks.current = entries;
    const defaultId = categories.items.find(c => c.isDefault)?.id;
    setLibrary({ version: 1, collections: categories.items.map(c => ({ id: c.id === defaultId ? defaultCollectionId : c.id, name: c.name })), entries: entries.map(e => ({ slug: e.article?.slug ?? e.articleId, collectionId: e.collectionId === defaultId ? defaultCollectionId : e.collectionId })) });
    setLoadedId(ownerId); setReady(true); setError(entries.length < saved.totalElements ? "Kitaplığın ilk 1000 kaydı gösteriliyor." : "");
  }, [ownerId, auth.ready]);
  useEffect(() => {
    setLibrary(emptyLibrary()); setReady(false); collections.current=[];bookmarks.current=[];
    const abort = new AbortController();
    void load(abort.signal).catch(error => { if(!abort.signal.aborted && identity.current === ownerId) { setError(error instanceof Error ? error.message : "Kitaplık okunamadı."); setLoadedId(ownerId); setReady(true); } });
    const focus = () => { if(document.visibilityState === "visible") void load(abort.signal).catch(() => {}); };
    const changed = () => void load(abort.signal).catch(() => {});
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("satir-library") : null;
    if(channel) channel.onmessage=changed;
    window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);
    return () => { abort.abort(); channel?.close();window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus); };
  }, [load,ownerId]);
  async function change(work: () => Promise<void>) {
    if(!ownerId || !ready || loadedId !== ownerId) return false;
    const user = ownerId; setError("");
    try { await work(); if(identity.current !== user) return false; await load(); if(typeof BroadcastChannel !== "undefined") { const channel=new BroadcastChannel("satir-library");channel.postMessage("changed");channel.close(); } return true; }
    catch(error) { if(identity.current === user) setError(error instanceof Error ? error.message : "İşlem tamamlanamadı."); return false; }
  }
  function collection(id?: string) { if(!id || id === defaultCollectionId) return collections.current.find(c => c.isDefault)?.id; return id; }
  async function articleId(slug: string) {
    const saved=bookmarks.current.find(e => (e.article?.slug ?? e.articleId) === slug); if(saved) return saved.articleId;
    const article=await api<{ id: string }>(`/articles/by-slug/${encodeURIComponent(slug)}`); return article.id;
  }
  async function refreshStats(slug:string,id:string) {const stats=await api<{views:number;claps:number;saves:number}>(`/articles/${id}/stats`).catch(()=>null);if(stats)update(slug,stats);}
  const value: MemberLibrary = { articles: ownerId && loadedId === ownerId ? bookmarks.current.flatMap(e => e.available && e.article ? [articleFromApi(e.article)] : []) : [], library: ownerId && loadedId === ownerId ? library : emptyLibrary(), ready: auth.ready && ready && loadedId === ownerId, member: !!ownerId, error,
    save: (slug,id) => change(async () => { const article=await articleId(slug);await api(`/me/bookmarks/${article}`, { method: "PUT", body: id ? { collectionId: collection(id) } : {} });await refreshStats(slug,article); }),
    remove: slug => change(async () => { const id=await articleId(slug);await api(`/me/bookmarks/${id}`, { method: "DELETE" });await refreshStats(slug,id); }),
    create: (name,slug) => change(async () => { const created=await api<Collection>("/me/collections", { method: "POST", body: { name }, idempotencyKey: crypto.randomUUID() }); if(slug) await api(`/me/bookmarks/${await articleId(slug)}`, { method: "PUT", body: { collectionId: created.id } }); }),
    rename: (id,name) => change(async () => { const c=collections.current.find(c => c.id === collection(id));if(!c) throw new Error("Koleksiyon bulunamadı.");await api(`/me/collections/${c.id}`, { method: "PATCH", body: { name }, version: c.version }); }),
    deleteCategory: id => change(async () => { const c=collections.current.find(c => c.id === collection(id));if(!c) throw new Error("Koleksiyon bulunamadı.");await api(`/me/collections/${c.id}`, { method: "DELETE", version: c.version }); }),
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSavedLibrary() { return useContext(Context); }
