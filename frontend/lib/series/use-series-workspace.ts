"use client";

import { useArticles } from "../articles/use-articles";
import { useCallback, useEffect, useState } from "react";
import { initialSeries, seriesValidationError, upgradeDemoSeries, validateSeries, type BlogSeries } from "./model";

export const seriesKey = "mrbyte-blogger:series:v1";
const seriesEvent = "mrbyte-series-updated";
function initial(): BlogSeries[] { return initialSeries.map((s) => ({ ...s, articleSlugs: [...s.articleSlugs] })); }
export function useSeriesWorkspace() {
  const { articles } = useArticles();
  const articleSlugs = articles.map((a) => a.slug);
  const [series, setSeries] = useState<BlogSeries[]>(initial);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(seriesKey);
        if (!raw) { setSeries(initial()); setError(null); return; }
        const parsed = validateSeries(JSON.parse(raw), articleSlugs);
        if (parsed) {
          const next = upgradeDemoSeries(parsed);
          setSeries(next); setError(null);
          if (next !== parsed) {
            try { localStorage.setItem(seriesKey, JSON.stringify(next)); }
            catch { setError("Örnek seri güncellemesi bu tarayıcıda kaydedilemedi."); }
          }
        }
        else setError("Kayıtlı seriler okunamadı. Geçerli serileri kaydederek kaydı yenileyebilirsin.");
      } catch { setError("Seri kaydı okunamadı. Tarayıcı kayıt erişimini kontrol et."); }
    }
    function sync(event: StorageEvent) { if (event.key === seriesKey || event.key === null) load(); }
    load(); setReady(true);
    window.addEventListener(seriesEvent, load); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(seriesEvent, load); window.removeEventListener("storage", sync); };
  }, [articles]);
  const save = useCallback((next: readonly BlogSeries[]) => {
    const invalid = seriesValidationError(next, articleSlugs);
    if (invalid) { setError(invalid); return false; }
    const checked = validateSeries(next, articleSlugs)!;
    try {
      localStorage.setItem(seriesKey, JSON.stringify(checked)); setSeries(checked); setError(null);
      window.dispatchEvent(new Event(seriesEvent)); return true;
    } catch { setError("Seriler kaydedilemedi. Değişiklikleri korumak için tarayıcı kayıt erişimi gerekir."); return false; }
  }, [articles]);
  return { series, save, ready, error };
}
