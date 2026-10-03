"use client";
import { useEffect, useState } from "react";
import { articles as fixtures, type Article } from "../content";
import { parseArticles, validateArticle } from "./model";
export const articleStorageKey = "mrbyte:articles:v1";
const updateEvent = "mrbyte:articles-updated";
export function useArticles() {
  const [articles, setArticles] = useState<readonly Article[]>(fixtures);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(articleStorageKey);
        const next = raw ? parseArticles(raw) : fixtures;
        if (next) { setArticles(next); setError(null); }
        else setError("Kayıtlı yazılar okunamadı. Mevcut kayıt değiştirilmedi.");
      } catch { setError("Yazı kaydına erişilemiyor."); }
    }
    function sync(e: StorageEvent) { if (e.key === articleStorageKey || e.key === null) load(); }
    load(); setReady(true);
    window.addEventListener(updateEvent, load); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(updateEvent, load); window.removeEventListener("storage", sync); };
  }, []);
  function save(article: Article, creating = false) {
    const checked = validateArticle(article);
    if (!ready || !checked || (creating && !checked.paragraphs.some((p) => p.trim()))) { setError("Yazı kaydedilemedi. Başlık, içerik, görsel ve tablo alanlarını kontrol et."); return false; }
    try {
      const raw = localStorage.getItem(articleStorageKey);
      const current = raw ? parseArticles(raw) : fixtures;
      if (!current) { setError("Kayıtlı yazılar okunamadığı için üzerine yazılmadı."); return false; }
      const exists = current.some((item) => item.slug === checked.slug);
      if (creating && exists) { setError("Bu kalıcı bağlantı başka bir yazıya ait. Yazı bilgilerinden farklı bir bağlantı seç."); return false; }
      if (!creating && !exists) { setError("Düzenlenen yazı bulunamadı; değişiklikler kaydedilmedi."); return false; }
      const next = creating ? [checked, ...current] : current.map((item) => item.slug === checked.slug ? checked : item);
      localStorage.setItem(articleStorageKey, JSON.stringify(next));
      setArticles(next); setError(null); window.dispatchEvent(new Event(updateEvent)); return true;
    } catch { setError("Yazı kaydedilemedi. Düzenlemelerin tuvalde duruyor; tarayıcı kaydını kontrol et."); return false; }
  }
  return { articles, ready, error, save };
}
