"use client";
import { useAuth } from "../auth/AuthProvider";
import { useEffect, useId, useRef, useState } from "react";
import { EngagementIcon } from "../EngagementIcon";
import { SlideLink } from "../SlideLink";
import { useArticleStats } from "../../lib/reactions/use-views";
import { useSavedLibrary } from "./SavedProvider";

export function SaveArticleButton({ slug, title, preview = false }: { slug: string; title: string; preview?: boolean }) {
  const { library, defaultId, ready, member, error, entryFor, save, remove, create } = useSavedLibrary();
  const auth = useAuth();
  const stats = useArticleStats([slug]);
  const saved = entryFor(slug);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [collectionId, setCollectionId] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    function dismiss(event: PointerEvent) { if (!container.current?.contains(event.target as Node)) setOpen(false); }
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  useEffect(() => { if (!member || preview) setOpen(false); }, [member, preview]);
  useEffect(() => { if (creating) nameInput.current?.focus(); }, [creating]);
  const total = stats ? stats.saves : null;
  const countTitle = "Bu yazıyı kitaplığına kaydeden üyelerin sayısı";
  async function act(task: () => Promise<boolean>, close: boolean) {
    setBusy(true);
    const ok = await task();
    setBusy(false);
    if (ok && close) setOpen(false);
  }
  if (preview) return <span className="save-count" aria-label={total === null ? "Kaydetme sayısı yok" : `${total} kaydetme`} title={countTitle}><EngagementIcon kind="save" />{total ?? "—"}</span>;
  if (!member) return <button className="save-article-button auth-locked" type="button" aria-label={`Giriş yap ve yazıyı kaydet: ${title}`} title={auth.session ? "Kaydetmek için e-postanı doğrula" : "Giriş yapman gerekiyor"} onClick={() => { if (!auth.session) auth.openAuth(); else auth.notify("Kitaplığı kullanmak için e-posta adresini doğrula"); }}><EngagementIcon kind="save" /><span className="visually-hidden">Giriş yapman gerekiyor</span>{total !== null && <span>{total}</span>}</button>;
  return <div className="save-control" ref={container} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} className="save-article-button" type="button" aria-label={`${saved ? "Kaydı yönet" : "Yazıyı kaydet"}: ${title}`} aria-pressed={!!saved} aria-expanded={open} aria-controls={id} disabled={!ready || busy} title={countTitle} aria-description={`${total ?? 0} kaydetme. ${countTitle}`} onClick={() => { if (!saved) void act(() => save(slug), false); setCollectionId(saved?.collectionId ?? defaultId); setCreating(false); setName(""); setOpen(!open); }}><EngagementIcon kind="save" /><span>{total ?? "—"}</span></button>
    {open && <div id={id} className="save-popover" role="region" aria-label="Kaydı düzenle">
      <div className="save-popover-heading"><strong>{saved ? "Kaydedildi" : "Yazıyı kaydet"}</strong><button type="button" aria-label="Kaydetme seçeneklerini kapat" onClick={() => setOpen(false)}>×</button></div>
      <form className="save-category-choice" onSubmit={(event) => { event.preventDefault(); void act(() => save(slug, collectionId), true); }}><label>Koleksiyon<select value={collectionId || defaultId} onChange={(event) => setCollectionId(event.target.value)}>{library.collections.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button type="submit" disabled={busy || (collectionId || defaultId) === saved?.collectionId}>Taşı</button></form>
      <button className="save-new-collection" type="button" aria-expanded={creating} onClick={() => setCreating(!creating)}><span aria-hidden="true">{creating ? "−" : "+"}</span> Yeni koleksiyon</button>
      {creating && <form className="save-new-form" onSubmit={(event) => { event.preventDefault(); void act(async () => { const ok = await create(name, slug); if (ok) setName(""); return ok; }, true); }}><label>Koleksiyon adı<input ref={nameInput} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. Türk edebiyatı" /></label><button className="save-create" type="submit" disabled={busy || !name.trim()}>Oluştur ve taşı</button></form>}
      <div className="save-popover-links"><SlideLink href="/kaydedilenler">Kitaplığım ↗</SlideLink><button type="button" disabled={busy} onClick={() => void act(() => remove(slug), true)}>Kaydı kaldır</button></div>
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>;
}
export function SavedLibraryLink() {
  const { member } = useSavedLibrary();
  return member ? <SlideLink className="saved-library-link" href="/kaydedilenler" aria-label="Kitaplığım" title="Kitaplığım"><EngagementIcon kind="save" /></SlideLink> : null;
}
