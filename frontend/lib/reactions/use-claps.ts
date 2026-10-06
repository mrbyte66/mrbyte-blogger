"use client";

import { usePublicData } from "../../components/api/PublicDataProvider";
import { useAuth } from "../../components/auth/AuthProvider";
import { api } from "../api/client";
import { seedReactions, subscribe, snapshot, current, resolveArticle, ensureEngagement, resetEngagement, update } from "../api/reactions";
import { useSyncExternalStore, useEffect, useState } from "react";
import { isArticleSlug } from "../articles/model";

export const clapKey = "mrbyte:claps:v1";
const clapEvent = "mrbyte:claps-changed";

function readClaps(): string[] {
  const raw = localStorage.getItem(clapKey);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !Array.isArray(data.articles) || data.articles.length > 1000 || !data.articles.every(isArticleSlug) || new Set(data.articles).size !== data.articles.length) throw new Error("Invalid claps");
  return data.articles;
}

/** Anonymous local prototype. Global totals require the future server adapter. */
export function useClaps(activeSlug?: string) {
  const publicData = usePublicData(); const auth = useAuth();
  if(publicData) seedReactions(publicData.articles);
  useSyncExternalStore(subscribe, snapshot, () => 0);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if(publicData) {
      let cancelled=false; setSlugs([]);setReady(false);resetEngagement(auth.session?.profile.id ?? "anonymous");
      if(!activeSlug) {setReady(true);return;}
      void resolveArticle(activeSlug).then(id => api<{ clapped: boolean }>(`/articles/${id}/my-clap`)).then(data => {if(!cancelled){setSlugs(data.clapped?[activeSlug]:[]);setReady(true);setError("");}}).catch(error => {if(!cancelled)setError(error instanceof Error ? error.message : "Alkış okunamadı.");});
      return () => {cancelled=true;};
    }
    function load() {
      try { setSlugs(readClaps()); setError(""); }
      catch { setError("Alkış kaydı okunamadı."); }
      setReady(true);
    }
    function sync(event: StorageEvent) { if (event.key === clapKey || event.key === null) load(); }
    load();
    window.addEventListener(clapEvent, load);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(clapEvent, load); window.removeEventListener("storage", sync); };
  }, [publicData, activeSlug, auth.session?.profile.id]);
  function toggle(slug: string) {
    if (!ready || !isArticleSlug(slug)) return;
    if(publicData) return (async () => {
      setReady(false);
      try { const id = await resolveArticle(slug);await ensureEngagement();const result=await api<{ clapped: boolean; claps: number }>(`/articles/${id}/clap`, { method: "PUT", body: { clapped: !slugs.includes(slug) } });setSlugs(result.clapped?[slug]:[]);update(slug,{ claps: result.claps });setError(""); }
      catch(error){setError(error instanceof Error ? error.message : "Alkış kaydedilemedi.");}
      finally {setReady(true);}
    })();
    try {
      const current = readClaps();
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      if (next.length > 1000) throw new Error("Local limit");
      localStorage.setItem(clapKey, JSON.stringify({ version: 1, articles: next }));
      setSlugs(next); setError("");
      window.dispatchEvent(new Event(clapEvent));
    } catch { setError("Alkış kaydedilemedi. Tarayıcı depolama iznini kontrol et."); }
  }
  return { ready, error, toggle, hasClapped: (slug: string) => slugs.includes(slug), count: (articles: readonly string[]) => publicData ? [...new Set(articles)].reduce((sum,slug) => sum+current(slug).claps,0) : new Set(articles.filter((slug) => slugs.includes(slug))).size };
}
