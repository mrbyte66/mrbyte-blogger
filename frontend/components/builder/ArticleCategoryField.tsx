"use client";
import { useId, useRef, useState } from "react";
import type { Article } from "../../lib/content";
import { categoryNames, type StudioCategory } from "../../lib/api/categories";
import { ApiError, describe } from "../../lib/api/http";
import { useContent } from "../data/SiteData";

/** Article selection and global category management share the API registry, never editable names as IDs. */
export function ArticleCategoryField({ article, onChange }: { article: Article; onChange: (next: Partial<Article>) => void }) {
  const { categories = [], categoryManager, articles } = useContent();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<StudioCategory | null>(null);
  const [removing, setRemoving] = useState<StudioCategory | null>(null);
  const [rename, setRename] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const selected = article.categoryIds ?? categories.filter((c) => (article.categories ?? [article.category]).includes(c.name)).map((c) => c.id);
  function select(ids: string[], registry = categories) {
    const names = categoryNames(ids, registry);
    onChange({ categoryIds: ids, categories: names, category: names[0] ?? "" });
  }
  async function create() {
    if (!categoryManager || !name.trim() || busy) return;
    if (name.trim() === "Tümü") { setError("Tümü filtre için ayrılmış bir ad. Başka bir kategori adı seç."); return; }
    setBusy(true); setError("");
    try {
      const created = await categoryManager.create(name.trim());
      select([...selected, created.id], [...categories, created]);
      setName(""); setCreating(false); setNotice("Kategori oluşturuldu ve seçildi.");
    } catch (cause) { setError(describe(cause)); }
    finally { setBusy(false); }
  }
  const usage = (category: StudioCategory) => articles.filter((a) => a.categoryIds?.includes(category.id) || (!a.categoryIds && (a.categories ?? [a.category]).includes(category.name))).length;
  async function saveRename() {
    if (!categoryManager || !editing || !rename.trim() || busy) return;
    if (rename.trim() === "Tümü") { setError("Tümü filtre için ayrılmış bir ad. Başka bir kategori adı seç."); return; }
    setBusy(true); setError("");
    try {
      const updated = await categoryManager.rename(editing, rename.trim());
      select([...selected], categories.map((c) => c.id === updated.id ? updated : c));
      setEditing(null); setNotice("Kategori güncellendi.");
    } catch (cause) {
      setError(describe(cause));
      if (cause instanceof ApiError && cause.status === 412) {
        setEditing(null); await categoryManager.refresh().catch(() => undefined);
      }
    } finally { setBusy(false); }
  }
  async function remove() {
    if (!categoryManager || !removing || busy || usage(removing) || selected.includes(removing.id)) return;
    setBusy(true); setError("");
    try { await categoryManager.remove(removing); setRemoving(null); setNotice("Kategori silindi."); }
    catch (cause) {
      setError(cause instanceof ApiError && cause.code === "CATEGORY_IN_USE" ? "Bu kategori kayıtlı veya yayındaki yazılarda kullanılıyor. Önce yazıların kategorilerini değiştirip kaydet." : describe(cause));
      if (cause instanceof ApiError && cause.status === 412) { setRemoving(null); await categoryManager.refresh().catch(() => undefined); }
    } finally { setBusy(false); }
  }
  function close() {
    if (busy) return;
    dialog.current?.close(); setEditing(null); setRemoving(null); setError(""); setOpen(false); trigger.current?.focus();
  }
  return <section className="category-field" aria-label="Yazı kategorileri">
    <div className="category-field-heading"><span>Kategoriler</span><button type="button" ref={trigger} className="category-text-action" disabled={!categoryManager} onClick={() => { setError(""); setNotice(""); setOpen(true); dialog.current?.showModal(); }}>Yönet</button></div>
    <fieldset className="studio-category-options" disabled={busy}><legend className="sr-only">Yazı kategorilerini seç</legend>
      {categories.map((category) => <label key={category.id}><input type="checkbox" checked={selected.includes(category.id)} disabled={(selected.length === 1 && selected.includes(category.id)) || (selected.length >= 10 && !selected.includes(category.id))} onChange={(e) => select(e.target.checked ? [...selected, category.id] : selected.filter((id) => id !== category.id))} /><span>{category.name}</span></label>)}
    </fieldset>
    {!categories.length && <p className="property-note">Henüz kategori yok. İlk kategorini ekle.</p>}
    <p className="category-hint">En az bir, en fazla 10 kategori seçebilirsin.</p>
    {creating ? <div className="category-create"><label className="studio-field"><span>Yeni kategori adı</span><input autoFocus maxLength={80} value={name} disabled={busy} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }} /></label><div className="category-actions"><button type="button" className="studio-primary" disabled={busy || !name.trim() || selected.length >= 10} onClick={() => void create()}>{busy ? "Ekleniyor…" : "Ekle ve seç"}</button><button type="button" className="category-text-action" disabled={busy} onClick={() => { setCreating(false); setError(""); }}>Vazgeç</button></div></div>
      : <button type="button" className="category-text-action category-add" disabled={!categoryManager} onClick={() => { setCreating(true); setError(""); setNotice(""); }}>+ Yeni kategori</button>}
    {!open && error && <p role="alert" className="category-feedback">{error}</p>}
    <p role="status" className="category-feedback">{notice}</p>
    <dialog ref={dialog} className="studio-confirm category-dialog" aria-labelledby={titleId} onCancel={(e) => { e.preventDefault(); close(); }} onClose={() => trigger.current?.focus()}>
      <header><div><h2 id={titleId}>Kategoriler</h2><p>Yazılarının ortak konu başlıkları.</p></div><button type="button" className="category-icon" aria-label="Kategori yönetimini kapat" disabled={busy} onClick={close}>×</button></header>
      <ul className="category-list">{categoryManager?.items.map((category) => <li key={category.id}>
        {editing?.id === category.id ? <div className="category-rename"><label className="studio-field"><span>Kategori adı</span><input autoFocus value={rename} maxLength={80} disabled={busy} onChange={(e) => setRename(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveRename(); } }} /></label><div className="category-actions"><button type="button" className="studio-primary" disabled={busy || !rename.trim() || rename.trim() === category.name} onClick={() => void saveRename()}>{busy ? "Kaydediliyor…" : "Kaydet"}</button><button type="button" className="category-text-action" disabled={busy} onClick={() => setEditing(null)}>Vazgeç</button></div></div>
          : <><div className="category-list-name"><strong>{category.name}</strong><span>{usage(category)} yazı</span></div><button type="button" className="category-icon" disabled={busy} aria-label={`Düzenle: ${category.name}`} onClick={() => { setEditing(category); setRename(category.name); setRemoving(null); setError(""); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z" /></svg></button><button type="button" className="category-icon" disabled={busy} aria-label={`Sil: ${category.name}`} onClick={() => { setRemoving(category); setEditing(null); setError(""); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></svg></button></>}
      </li>)}</ul>
      {removing && <section className="category-delete" aria-label="Kategori silme onayı"><strong>“{removing.name}” silinsin mi?</strong><p>{usage(removing) ? "Bu kategori yazılarda kullanılıyor. Önce ilgili yazıların kategorilerini değiştirip kaydet." : selected.includes(removing.id) ? "Bu kategori düzenlediğin yazıda seçili. Önce başka bir kategori seçip yazını kaydet." : "Bu işlem yalnızca kategoriyi siler; yazılarını silmez."}</p><div className="category-actions"><button type="button" className="studio-secondary" disabled={busy || !!usage(removing) || selected.includes(removing.id)} onClick={() => void remove()}>{busy ? "Siliniyor…" : "Kategoriyi sil"}</button><button type="button" className="category-text-action" disabled={busy} onClick={() => setRemoving(null)}>Vazgeç</button></div></section>}
      {error && <p role="alert" className="category-feedback">{error}</p>}
      <footer><p>Kategori değişiklikleri ortak listeye hemen yansır. Yazı seçimlerini sayfayı kaydederek uygula.</p><button type="button" className="studio-secondary" disabled={busy} onClick={close}>Bitti</button></footer>
    </dialog>
  </section>;
}
