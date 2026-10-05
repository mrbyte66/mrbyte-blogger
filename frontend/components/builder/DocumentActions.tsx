import { useEffect, useRef } from "react";
import { type ContentStatus } from "../../lib/editorial/store";
export function DocumentActions({ status, disabled, canPublish, onSave, onSchedule }: { status: ContentStatus; disabled: boolean; canPublish: boolean; onSave: (status: ContentStatus) => void; onSchedule?: () => void }) {
  const root = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function outside(event: PointerEvent) { if (root.current?.open && !root.current.contains(event.target as Node)) root.current.open = false; }
    function escape(event: KeyboardEvent) { if (event.key === "Escape" && root.current?.open) { event.preventDefault(); root.current.open = false; root.current.querySelector("summary")?.focus(); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  function act(next: ContentStatus) { if (root.current) root.current.open = false; onSave(next); }
  return <details className="document-actions" ref={root}><summary aria-label="İçerik işlemleri" title="İçerik işlemleri">•••</summary><div>
    {status !== "published" && <button disabled={disabled || !canPublish} onClick={() => act("published")}>Yayına al</button>}
    {onSchedule && <button disabled={disabled} onClick={() => { if (root.current) root.current.open = false; onSchedule(); }}>{status === "scheduled" ? "Yayın planını düzenle" : "Yayını planla"}</button>}
    <button disabled={disabled} onClick={() => act("draft")}>{status === "trashed" || status === "archived" ? "Taslağa geri yükle" : "Taslak olarak kaydet"}</button>
    {status !== "archived" && status !== "trashed" && <button disabled={disabled} onClick={() => act("archived")}>Arşivle</button>}
    {status !== "trashed" && <button className="document-trash" disabled={disabled} onClick={() => act("trashed")}>Sil · çöp kutusuna taşı</button>}
    <p>Arşiv ve çöp kutusu ziyaretçiden gizlenir. İçerikler geri yüklenebilir; kalıcı silme yoktur.</p>
  </div></details>;
}
