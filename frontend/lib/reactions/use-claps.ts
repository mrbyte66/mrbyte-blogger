"use client";

import { useEffect, useState } from "react";
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
export function useClaps() {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
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
  }, []);
  function toggle(slug: string) {
    if (!ready || !isArticleSlug(slug)) return;
    try {
      const current = readClaps();
      const next = current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug];
      if (next.length > 1000) throw new Error("Local limit");
      localStorage.setItem(clapKey, JSON.stringify({ version: 1, articles: next }));
      setSlugs(next); setError("");
      window.dispatchEvent(new Event(clapEvent));
    } catch { setError("Alkış kaydedilemedi. Tarayıcı depolama iznini kontrol et."); }
  }
  return { ready, error, toggle, hasClapped: (slug: string) => slugs.includes(slug), count: (articles: readonly string[]) => new Set(articles.filter((slug) => slugs.includes(slug))).size };
}
