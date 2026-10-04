"use client";
import { useEffect, useId, useRef, useState } from "react";
import { EngagementIcon } from "../EngagementIcon";
import { SlideLink } from "../SlideLink";
import { useSavedLibrary } from "./SavedProvider";

export function SaveArticleButton({ slug, title, preview = false }: { slug: string; title: string; preview?: boolean }) {
  const { library, ready, member, error, save, remove, create } = useSavedLibrary();
  const saved = library.entries.find((entry) => entry.slug === slug);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const [collectionId, setCollectionId] = useState("saved");
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
  const countTitle = "Üye önizlemesi: yalnız bu tarayıcıdaki kayıt. Ortak kaydetme toplamı sunucu bağlantısıyla gelecek.";
  if (preview || !member) return <span className="save-count" aria-label={`${saved ? 1 : 0} kaydetme`} title={countTitle}><EngagementIcon kind="save" />{saved ? 1 : 0}</span>;
  return <div className="save-control" ref={container} onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} className="save-article-button" type="button" aria-label={`${saved ? "Kaydı yönet" : "Yazıyı kaydet"}: ${title}`} aria-pressed={!!saved} aria-expanded={open} aria-controls={id} disabled={!ready} title={countTitle} aria-description={`${saved ? 1 : 0} kaydetme. ${countTitle}`} onClick={() => { if (!saved) save(slug); setCollectionId(saved?.collectionId ?? "saved"); setCreating(false); setName(""); setOpen(!open); }}><EngagementIcon kind="save" /><span>{saved ? 1 : 0}</span></button>
    {open && <div id={id} className="save-popover" role="region" aria-label="Kaydı düzenle">
      <div className="save-popover-heading"><strong>{saved ? "Kaydedildi" : "Yazıyı kaydet"}</strong><button type="button" aria-label="Kaydetme seçeneklerini kapat" onClick={() => setOpen(false)}>×</button></div>
      <form className="save-category-choice" onSubmit={(event) => { event.preventDefault(); if (save(slug, collectionId)) setOpen(false); }}><label>Koleksiyon<select value={collectionId} onChange={(event) => setCollectionId(event.target.value)}>{library.collections.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><button type="submit" disabled={collectionId === saved?.collectionId}>Taşı</button></form>
      <button className="save-new-collection" type="button" aria-expanded={creating} onClick={() => setCreating(!creating)}><span aria-hidden="true">{creating ? "−" : "+"}</span> Yeni koleksiyon</button>
      {creating && <form className="save-new-form" onSubmit={(event) => { event.preventDefault(); if (create(name, slug)) { setName(""); setOpen(false); } }}><label>Koleksiyon adı<input ref={nameInput} maxLength={60} value={name} onChange={(event) => setName(event.target.value)} placeholder="Örn. Türk edebiyatı" /></label><button className="save-create" type="submit" disabled={!name.trim()}>Oluştur ve taşı</button></form>}
      <div className="save-popover-links"><SlideLink href="/kaydedilenler">Kitaplığım ↗</SlideLink><button type="button" onClick={() => { if (remove(slug)) setOpen(false); }}>Kaydı kaldır</button></div>
      {error && <p role="alert">{error}</p>}
    </div>}
  </div>;
}
export function SavedLibraryLink() {
  const { member } = useSavedLibrary();
  return member ? <SlideLink className="saved-library-link" href="/kaydedilenler" aria-label="Kitaplığım" title="Kitaplığım · üye önizlemesi"><EngagementIcon kind="save" /></SlideLink> : null;
}
