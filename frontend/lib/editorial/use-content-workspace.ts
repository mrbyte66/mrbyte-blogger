"use client";
import { useEffect, useState } from "react";
import { articleStorageKey, contentEvent, contentKey, initialContent, readContent, seriesKey, writeContent, type ContentWorkspace } from "./store";

export function useContentWorkspace() {
  const [content, setContent] = useState<ContentWorkspace>(initialContent);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function load() {
      try { setContent(readContent()); setError(null); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "İçerik kaydına erişilemiyor."); }
    }
    function sync(event: StorageEvent) { if (!event.key || [contentKey, articleStorageKey, seriesKey].includes(event.key)) load(); }
    load(); setReady(true);
    window.addEventListener(contentEvent, load); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(contentEvent, load); window.removeEventListener("storage", sync); };
  }, []);
  function mutate(update: (current: ContentWorkspace) => ContentWorkspace) {
    if (!ready) return false;
    try { const current = readContent(); setContent(writeContent(update(current), current)); setError(null); return true; }
    catch (cause) { setError(`İçerik kaydedilemedi. ${cause instanceof Error ? cause.message : "Tarayıcı kaydını kontrol et."}`); return false; }
  }
  return { ...content, ready, error, mutate };
}
