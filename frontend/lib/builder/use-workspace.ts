"use client";

import { useCallback, useEffect, useState } from "react";
import { createWorkspace, parseWorkspace, type Workspace } from "./model";
import { previewEvents } from "./preview-protocol";

export const workspaceKey = "mrbyte:builder:v1";
export function useWorkspace() {
  const [workspace, setWorkspace] = useState<Workspace>(createWorkspace);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

  const save = useCallback((next: Workspace, requirePersistence = false) => {
    try { localStorage.setItem(workspaceKey, JSON.stringify(next)); setWorkspace(next); setStorageError(null); return true; }
    catch { if (!requirePersistence) setWorkspace(next); setStorageError("Tarayıcı kaydı kullanılamıyor. Taslak bu editörde kalır; tema uygulamak için kayıt erişimi gerekir."); return false; }
  }, []);
  return { workspace, save, ready, storageError };
}
