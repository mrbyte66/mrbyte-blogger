"use client";

import { usePublicData } from "../../components/api/PublicDataProvider";
import { seedReactions, subscribe, snapshot, totals as serverTotals, recordImpression } from "../api/reactions";
import { useSyncExternalStore, useCallback, useEffect, useRef, useState } from "react";
import { isArticleSlug } from "../articles/model";

export const viewKey = "mrbyte:views:v1";
const viewEvent = "mrbyte:views-changed";
type ViewTotals = Record<string, number>;

function readViews(): ViewTotals {
  const raw = localStorage.getItem(viewKey);
  if (!raw) return {};
  const data = JSON.parse(raw);
  if (data?.version !== 1 || !data.articles || typeof data.articles !== "object" || Array.isArray(data.articles)) throw new Error("Invalid views");
  const entries = Object.entries(data.articles);
  if (entries.length > 1000 || entries.some(([slug, total]) => !isArticleSlug(slug) || !Number.isSafeInteger(total) || (total as number) < 0)) throw new Error("Invalid views");
  return Object.fromEntries(entries) as ViewTotals;
}

export function useArticleViews(slug: string, recordOnMount = false, source: "card" | "permalink" = "permalink") {
  const publicData = usePublicData();
  if(publicData) seedReactions(publicData.articles);
  useSyncExternalStore(subscribe, snapshot, () => 0);
  const [totals, setTotals] = useState<ViewTotals>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const recorded = useRef(false);
  useEffect(()=>{recorded.current=false;},[slug]);
  useEffect(() => {
    if(publicData) { setReady(true); return; }
    function load() {
      try { setTotals(readViews()); setError(""); }
      catch { setError("Görüntülenme sayısı okunamadı."); }
      setReady(true);
    }
    function sync(event: StorageEvent) { if (event.key === viewKey || event.key === null) load(); }
    load();
    window.addEventListener(viewEvent, load);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(viewEvent, load); window.removeEventListener("storage", sync); };
  }, [publicData]);
  const record = useCallback(() => {
    if (!ready || recorded.current || !isArticleSlug(slug)) return;
    recorded.current = true;
    if(publicData) { void recordImpression(slug,source).catch(error => { recorded.current=false;setError(error instanceof Error ? error.message : "Görüntülenme kaydedilemedi."); }); return; }
    try {
      const articles = readViews();
      if ((articles[slug] ?? 0) >= Number.MAX_SAFE_INTEGER) return;
      articles[slug] = (articles[slug] ?? 0) + 1;
      localStorage.setItem(viewKey, JSON.stringify({ version: 1, articles }));
      setTotals(articles); setError("");
      window.dispatchEvent(new Event(viewEvent));
    } catch { setError("Görüntülenme kaydedilemedi. Tarayıcı depolama iznini kontrol et."); }
  }, [ready, slug, publicData, source]);
  useEffect(() => { if (ready && recordOnMount) record(); }, [ready, recordOnMount, record]);
  const values = publicData ? Object.fromEntries(Object.entries(serverTotals()).map(([slug,stats]) => [slug,stats.views])) : totals;
  return { count: values[slug] ?? 0, totals: values, ready, error, record };
}

/** Counts a summary when its card first appears on screen, rather than when hidden items mount. */
export function useVisibleArticleView(slug: string, enabled = true): { attach: (node: HTMLElement | null) => void; count: number; error: string } {
  const publicData=usePublicData();
  const ref = useRef<HTMLElement>(null);
  const { count, error, ready, record } = useArticleViews(slug, false, "card");
  const attach = useCallback((node: HTMLElement | null) => { ref.current = node; }, []);
  useEffect(() => {
    const node = ref.current;
    if (!enabled || !ready || !node) return;
    if (!("IntersectionObserver" in window)) { if(!publicData)record(); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && entry.intersectionRatio >= 0.2) { record(); observer.disconnect(); }
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ready, record,publicData]);
  return { attach, count, error };
}
