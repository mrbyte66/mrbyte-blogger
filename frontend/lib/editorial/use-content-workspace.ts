"use client";
import { usePublicData } from "../../components/api/PublicDataProvider";
import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { PartialStudioSaveError, loadStudio, saveStudioArticle, saveStudioSeries } from "../api/studio";
import type { DocumentDraft } from "../builder/document-protocol";
import { articleStorageKey, contentEvent, contentKey, initialContent, readContent, seriesKey, writeContent, type ContentWorkspace } from "./store";

export function useContentWorkspace() {
  const data = usePublicData();
  const auth = useAuth();
  const generation=useRef(0);
  const mounted = useRef(true);
  const busy = useRef(false);
  const owner = !!data && auth.session?.profile.role === "owner" && auth.session.profile.verified;
  const studio = owner && typeof window !== "undefined" && /^\/(studio|preview)(\/|$)/.test(window.location.pathname);
  const [content, setContent] = useState<ContentWorkspace>(() => data ? { articles: [...data.articles], series: [...data.series] } : initialContent);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const request=++generation.current;mounted.current=true;
    if(data) {
      if(studio) { setContent({articles:[],series:[]});setReady(false); const reload=()=>{void loadStudio().then(next=>{if(mounted.current&&generation.current===request){setContent(next);setReady(true);setError(null);}}).catch(cause=>{if(mounted.current&&generation.current===request){setError(cause instanceof Error?cause.message:"Studio yüklenemedi.");setReady(false);}});};reload();window.addEventListener("satir:studio-content",reload);return()=>{mounted.current=false;generation.current++;window.removeEventListener("satir:studio-content",reload);}; }
      setContent({ articles: [...data.articles], series: [...data.series] }); setReady(true); return;
    }
    function load() {
      try { setContent(readContent()); setError(null); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "İçerik kaydına erişilemiyor."); }
    }
    function sync(event: StorageEvent) { if (!event.key || [contentKey, articleStorageKey, seriesKey].includes(event.key)) load(); }
    load(); setReady(true);
    window.addEventListener(contentEvent, load); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(contentEvent, load); window.removeEventListener("storage", sync); };
  }, [data,studio]);
  function mutate(update: (current: ContentWorkspace) => ContentWorkspace) {
    if (!ready) return false;
    if (data) { setError("Studio API bağlantısı hazırlanıyor; tarayıcıya kalıcı kayıt yapılmadı."); return false; }
    try { const current = readContent(); setContent(writeContent(update(current), current)); setError(null); return true; }
    catch (cause) { setError(`İçerik kaydedilemedi. ${cause instanceof Error ? cause.message : "Tarayıcı kaydını kontrol et."}`); return false; }
  }
  async function persist(draft: DocumentDraft, seriesId?: string | null): Promise<DocumentDraft | null> {
    if(!studio || !ready || busy.current) return null;
    const request=generation.current;busy.current=true;setError(null);
    try {
      const saved:DocumentDraft=draft.kind==="article" ? {kind:"article",article:await saveStudioArticle(draft.article,content,seriesId ?? null)} : {kind:"series",series:await saveStudioSeries(draft.series,content)};
      const next=await loadStudio();if(request!==generation.current)return null;setContent(next);window.dispatchEvent(new Event("satir:studio-content"));return saved;
    } catch(cause) {if(cause instanceof PartialStudioSaveError && request===generation.current){try{const next=await loadStudio();if(request===generation.current)setContent(next);}catch{/* The persisted result remains available in the error for safe retry. */}throw cause;}if(request===generation.current)setError(cause instanceof Error?cause.message:"İçerik kaydedilemedi.");return null;}
    finally {busy.current=false;}
  }
  function saveDocument(draft:DocumentDraft,seriesId?:string|null):DocumentDraft|null|Promise<DocumentDraft|null> {
    if(data)return persist(draft,seriesId);
    const saved=mutate(current=>draft.kind==="article" ? { ...current,articles:current.articles.some(a=>a.slug===draft.article.slug)?current.articles.map(a=>a.slug===draft.article.slug?draft.article:a):[...current.articles,draft.article] } : {...current,series:current.series.some(s=>s.id===draft.series.id)?current.series.map(s=>s.id===draft.series.id?draft.series:s):[...current.series,draft.series]});
    return saved?draft:null;
  }
  return { ...content, ready, error, mutate, saveDocument, apiMode:!!data };
}
