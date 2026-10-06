"use client";

import { usePublicData } from "../../components/api/PublicDataProvider";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "../../components/auth/AuthProvider";
import { api } from "../api/client";
import { loadTheme, themeToWire, type ThemeWorkspace } from "../api/theme";
import { createWorkspace, parseWorkspace, type Workspace } from "./model";
import { previewEvents } from "./preview-protocol";

export const workspaceKey = "mrbyte:builder:v1";
export function useWorkspace() {
  const data = usePublicData();
  const auth=useAuth();
  const generation=useRef(0);
  const wire=useRef<ThemeWorkspace|null>(null);
  const queue=useRef<Promise<boolean>>(Promise.resolve(true));
  const saving=useRef(false);
  const studio=!!data && auth.session?.profile.role==="owner" && typeof window!=="undefined" && /^\/(studio|preview)(\/|$)/.test(window.location.pathname);
  const [workspace, setWorkspace] = useState<Workspace>(() => data ? { version: 1, draft: data.theme, applied: data.theme } : createWorkspace());
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    const request=++generation.current;
    if(data) {
      wire.current=null;let live=true;
      if(studio) {setReady(false);void loadTheme().then(value=>{if(live){wire.current=value.wire;setWorkspace(value.editor);setReady(true);setStorageError(null);}}).catch(error=>{if(live)setStorageError(error instanceof Error?error.message:"Tema yüklenemedi.");});}
      else {setWorkspace({version:1,draft:data.theme,applied:data.theme});setReady(true);}
      function receive(event:MessageEvent) {if(window.parent===window||event.source!==window.parent||event.origin!==window.location.origin||event.data?.type!==previewEvents.workspace||typeof event.data.workspace!=="string")return;const next=parseWorkspace(event.data.workspace);if(next)setWorkspace(next);}
      window.addEventListener("message",receive);return()=>{live=false;generation.current++;wire.current=null;window.removeEventListener("message",receive);};
    }
    function load() {
      try {
        const raw = localStorage.getItem(workspaceKey);
        if (!raw) { setWorkspace(createWorkspace()); setStorageError(null); return; }
        const saved = parseWorkspace(raw);
        if (saved) { setWorkspace(saved); setStorageError(null); }
        else setStorageError("Kayıtlı tema okunamadı. Bu oturumdaki düzenini uygulayarak yeni bir kayıt oluşturabilirsin.");
      } catch { setStorageError("Tarayıcı kaydı kullanılamıyor. Değişiklikler yalnızca bu oturumda kalacak."); }
    }
    load();
    setReady(true);
    function sync(event: StorageEvent) { if (event.key === workspaceKey || event.key === null) load(); }
    function receivePreview(event: MessageEvent) {
      if (window.parent === window || event.source !== window.parent || event.origin !== window.location.origin || event.data?.type !== previewEvents.workspace || typeof event.data.workspace !== "string") return;
      const preview = parseWorkspace(event.data.workspace);
      if (preview) setWorkspace(preview);
    }
    window.addEventListener("storage", sync);
    window.addEventListener("message", receivePreview);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener("message", receivePreview); };
  }, [data,studio]);

  const save = useCallback((next: Workspace, requirePersistence = false) => {
    if(data) {
      if(!studio||!wire.current||saving.current) return false;
      setWorkspace(requirePersistence ? {...next,applied:workspace.applied} : next);
      const request=generation.current;
      const task=async()=>{
        try {
          if(!wire.current||request!==generation.current)return false;
          const draft=await themeToWire(next.draft);
          const stored=await api<ThemeWorkspace>("/studio/theme/draft",{method:"PUT",version:wire.current.version,body:draft});if(request!==generation.current)return false;wire.current=stored;
          if(requirePersistence) {const applied=await api<ThemeWorkspace>("/studio/theme/apply",{method:"POST",version:wire.current.version,idempotencyKey:crypto.randomUUID(),body:{draftRevisionId:wire.current.draftRevisionId}});if(request!==generation.current)return false;wire.current=applied;setWorkspace(next);}
          if(request!==generation.current)return false;setStorageError(null);return true;
        } catch(error) {if(request===generation.current)setStorageError(error instanceof Error?error.message:"Tema kaydedilemedi.");return false;}
      };
      queue.current=queue.current.then(task);return queue.current;
    }
    try { localStorage.setItem(workspaceKey, JSON.stringify(next)); setWorkspace(next); setStorageError(null); return true; }
    catch { if (!requirePersistence) setWorkspace(next); setStorageError("Tarayıcı kaydı kullanılamıyor. Taslak bu editörde kalır; tema uygulamak için kayıt erişimi gerekir."); return false; }
  }, [data,studio,workspace.applied]);
  return { workspace, save, ready, storageError };
}
