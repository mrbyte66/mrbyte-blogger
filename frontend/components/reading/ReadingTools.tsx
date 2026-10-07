"use client";

import { useAuth } from "../auth/AuthProvider";
import { scrollBehavior } from "../../lib/motion";

import { useEffect, useRef, useState } from "react";
import { anchorRange, findAnchor, maxMarks, maxNoteLength, selectionAnchors, type ReadingMark, type ReadingMarkKind, type TextAnchor } from "../../lib/reading/model";
import { readReadingDocument, readingStorageKey, writeReadingDocument } from "../../lib/reading/storage";
import { createServerMark, deleteServerMark, importGuestMarks, loadServerMarks, type ServerArticle } from "../../lib/reading/server";
import { describe } from "../../lib/api/http";

type HighlightEnvironment = {
  CSS?: { highlights?: { set: (name: string, highlight: unknown) => void; delete: (name: string) => void } };
  Highlight?: new (...ranges: Range[]) => unknown;
};
const highlightNames = { highlight: "mrbyte-reading-highlight", underline: "mrbyte-reading-underline", note: "mrbyte-reading-note" };
const kindLabels = { highlight: "Fosforlu işaret", underline: "Alt çizgi", note: "Not" };

/**
 * Guests keep marks in this browser only. A verified member's marks live in their account when the
 * article is a published server article ({@code server}); guest marks are imported only on request.
 */
export function ReadingTools(props: { articleId: string; contentRootId: string; contentRevision?: string; server?: ServerArticle }) {
  const { session } = useAuth();
  const memberId = session?.profile.id;
  const account = !!(session?.profile.verified && props.server);
  return <ScopedReadingTools key={`${props.articleId}:${memberId ?? "guest"}:${account}`} {...props} memberId={memberId} server={account ? props.server : undefined} />;
}
function ScopedReadingTools({ articleId, contentRootId, contentRevision = "", memberId, server }: { articleId: string; contentRootId: string; contentRevision?: string; memberId?: string; server?: ServerArticle }) {
  const [marks, setMarks] = useState<ReadingMark[]>([]);
  const [fragments, setFragments] = useState<TextAnchor[]>([]);
  const [open, setOpen] = useState(false);
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [unresolved, setUnresolved] = useState(0);
  const [ready, setReady] = useState(false);
  const [undo, setUndo] = useState<{ mark: ReadingMark; index: number } | null>(null);
  const [guestMarks, setGuestMarks] = useState<ReadingMark[]>([]);
  const [importing, setImporting] = useState(false);
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const quote = fragments.map((fragment) => fragment.quote).join("\n");

  useEffect(() => {
    if (server) {
      let cancelled = false;
      const loadAccount = () => loadServerMarks(server).then((loaded) => { if (!cancelled) { setMarks(loaded); setStorageError(null); setReady(true); } },
        (cause) => { if (!cancelled) { setStorageError(`Notların yüklenemedi: ${describe(cause)}`); setReady(false); } });
      void loadAccount();
      setGuestMarks(readReadingDocument(articleId).document.marks);
      // Another device may have changed the marks: re-read when the tab gets focus again.
      const visible = () => { if (document.visibilityState === "visible") void loadAccount(); };
      window.addEventListener("focus", visible);
      return () => { cancelled = true; window.removeEventListener("focus", visible); };
    }
    function load() {
      const loaded = readReadingDocument(articleId, memberId);
      setMarks(loaded.document.marks); setStorageError(loaded.error); setReady(true);
      setFragments([]); setWriting(false); setUndo(null); setStatus("");
    }
    function sync(event: StorageEvent) { if (event.key === readingStorageKey(articleId, memberId) || event.key === null) load(); }
    load(); window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [articleId, memberId, server]);
  useEffect(() => {
    function capture() {
      const root = document.getElementById(contentRootId);
      if (!root) return;
      const next = selectionAnchors(root, window.getSelection());
      if (next.length) { setFragments(next); setStatus(""); }
      else if (root.contains(document.activeElement)) setFragments([]);
    }
    function finishPointerSelection(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element) || target.closest(".reading-toolbar, .reading-panel")) return;
      const root = document.getElementById(contentRootId);
      if (!root) return;
      const next = root.contains(target) ? selectionAnchors(root, window.getSelection()) : [];
      setFragments(next);
      if (!next.length) {
        setWriting(false);
        window.getSelection()?.removeAllRanges();
      }
    }
    document.addEventListener("selectionchange", capture);
    document.addEventListener("pointerup", finishPointerSelection);
    document.addEventListener("pointercancel", finishPointerSelection);
    return () => {
      document.removeEventListener("selectionchange", capture);
      document.removeEventListener("pointerup", finishPointerSelection);
      document.removeEventListener("pointercancel", finishPointerSelection);
    };
  }, [contentRootId]);
  useEffect(() => { setFragments([]); setWriting(false); }, [contentRevision]);
  useEffect(() => { if (writing) noteInput.current?.focus(); }, [writing]);
  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false); toggle.current?.focus();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  useEffect(() => {
    const root = document.getElementById(contentRootId);
    const environment = window as unknown as HighlightEnvironment;
    const registry = environment.CSS?.highlights;
    const Constructor = environment.Highlight;
    const available = Boolean(registry && Constructor);
    setSupported(available);
    if (!root) return;
    let missing = 0;
    const ranges: Record<ReadingMarkKind, Range[]> = { highlight: [], underline: [], note: [] };
    for (const mark of marks) {
      const resolved = mark.fragments.map((fragment) => anchorRange(root, fragment));
      if (resolved.some((range) => !range)) missing++;
      ranges[mark.kind].push(...resolved.filter((range): range is Range => range !== null));
    }
    setUnresolved(missing);
    if (registry && Constructor) {
      for (const kind of Object.keys(highlightNames) as ReadingMarkKind[]) registry.set(highlightNames[kind], new Constructor(...ranges[kind]));
    }
    return () => { for (const name of Object.values(highlightNames)) registry?.delete(name); };
  }, [marks, contentRootId, contentRevision]);

  /** Account mode applies the change optimistically, then confirms it with the server or rolls back. */
  function persist(next: ReadingMark[], message: string, change: { create?: ReadingMark; remove?: ReadingMark }) {
    if (server) {
      const previous = marks;
      setMarks(next); setStatus(`${message} Kaydediliyor…`);
      const request = change.create ? createServerMark(server, change.create) : deleteServerMark(server, change.remove!.id);
      request.then(() => { setStorageError(null); setStatus(`${message} Hesabına kaydedildi.`); },
        (cause) => { setMarks(previous); setStorageError(`Kaydedilemedi: ${describe(cause)}`); setStatus(""); });
      return;
    }
    const saved = writeReadingDocument({ version: 1, articleId, marks: next }, memberId);
    setMarks(next);
    setStorageError(saved ? null : "Tarayıcı kaydı başarısız. Bu değişiklikler sayfa kapanınca kaybolabilir.");
    setStatus(saved ? `${message} Bu tarayıcıya kaydedildi.` : `${message} Yalnızca bu oturumda tutuluyor.`);
  }
  /** Explicit, member-confirmed import of this browser's guest marks; local copies go only after success. */
  async function importGuest() {
    if (!server || !guestMarks.length) return;
    setImporting(true);
    const stored = readReadingDocument(articleId).document;
    // One import ID per local document makes a retried import return the same result.
    const clientImportId = stored.importId ?? crypto.randomUUID();
    writeReadingDocument({ ...stored, importId: clientImportId });
    try {
      const result = await importGuestMarks(server, stored.marks, clientImportId);
      const remaining = stored.marks.filter((mark) => !result.accepted.includes(mark.id));
      writeReadingDocument({ version: 1, articleId, marks: remaining });
      setGuestMarks(remaining);
      setMarks(await loadServerMarks(server));
      setStatus(`${result.accepted.length} misafir kaydı hesabına aktarıldı.${result.rejected ? ` ${result.rejected} kayıt metinle eşleşmediği için bu tarayıcıda bırakıldı.` : ""}`);
    } catch (cause) { setStorageError(`İçe aktarılamadı: ${describe(cause)}`); }
    finally { setImporting(false); }
  }
  function add(kind: ReadingMarkKind) {
    if (!ready || !fragments.length || marks.length >= maxMarks || (kind === "note" && !note.trim())) return;
    const mark: ReadingMark = { id: crypto.randomUUID(), kind, fragments, note: kind === "note" ? note.trim() : "", createdAt: new Date().toISOString() };
    persist([...marks, mark], `${kindLabels[kind]} eklendi.`, { create: mark });
    setFragments([]); setNote(""); setWriting(false); setUndo(null);
    window.getSelection()?.removeAllRanges();
  }
  function remove(mark: ReadingMark, index: number) {
    persist(marks.filter((item) => item.id !== mark.id), "İşaret kaldırıldı.", { remove: mark });
    setUndo({ mark, index });
  }
  function jump(mark: ReadingMark) {
    const root = document.getElementById(contentRootId);
    const paragraph = root && findAnchor(root, mark.fragments[0].anchorId);
    if (!paragraph) { setStatus("Bu alıntının bölümü artık bulunamıyor. Kayıtlı notun listede korunuyor."); return; }
    if (matchMedia("(max-width: 1100px)").matches) setOpen(false);
    paragraph.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    setStatus("Alıntının bulunduğu bölüme gidildi.");
  }
  const disabled = !ready || fragments.length === 0 || marks.length >= maxMarks;
  return <aside className={`reading-tools ${open ? "is-open" : ""}`} aria-label="Okuma araçları">
    <div className="reading-toolbar" role="group" aria-label="Metin işaretleme araçları">
      <button ref={toggle} className="reading-tool reading-toggle" disabled={!ready} aria-expanded={open} aria-controls="reading-notes-panel" onClick={() => setOpen(!open)}><span aria-hidden="true">✎</span><span>{open ? "Kapat" : "Notlar"}<small>{marks.length} kayıt</small></span></button>
      <button className="reading-tool" disabled={disabled} onClick={() => add("highlight")} aria-label="Seçili metni fosforlu kalemle işaretle"><span aria-hidden="true">▰</span><span>Fosforlu</span></button>
      <button className="reading-tool" disabled={disabled} onClick={() => add("underline")} aria-label="Seçili metnin altını çiz"><span aria-hidden="true"><u>U</u></span><span>Altını çiz</span></button>
      <button className="reading-tool" disabled={disabled} onClick={() => { setOpen(true); setWriting(true); setNote(""); }} aria-label="Seçili metne not ekle"><span aria-hidden="true">＋</span><span>Not ekle</span></button>
    </div>
    {!open && <p className="reading-hint">Metin seç, işaretle.</p>}
    {open && <section id="reading-notes-panel" className="reading-panel" aria-label="Bu yazıdaki okuma notların">
      <header><p className="reading-eyebrow">KİŞİSEL OKUMA ALANI</p><h2>Satır aralarında.</h2><p>{server ? "Notların hesabında saklanır ve giriş yaptığın cihazlarda görünür." : "Notların bu tarayıcıda sana ait."} Site sahibiyle veya diğer okurlarla paylaşılmaz.</p></header>
      {server && guestMarks.length > 0 && <div className="reading-availability"><p>Bu tarayıcıda hesapsız eklediğin {guestMarks.length} kayıt var. İstersen hesabına aktarabilirsin.</p><button className="reading-text-button" disabled={importing} onClick={() => void importGuest()}>{importing ? "Aktarılıyor…" : "Misafir notlarını hesabıma aktar"}</button></div>}
      {!supported && <p className="reading-availability">Bu tarayıcı metnin üzerinde renk ve çizgi göstermeyi desteklemiyor. İşaretlerin ve notların bu listede kaydedilir.</p>}
      {unresolved > 0 && <p className="reading-availability">{unresolved} işaretin metindeki yeri değişmiş olabilir. Kaydettiğin alıntılar burada korunuyor.</p>}
      {fragments.length > 0 ? <div className="reading-selection"><strong>Seçilen alıntı</strong><blockquote>{quote}</blockquote><button className="reading-text-button" onClick={() => { setFragments([]); setWriting(false); window.getSelection()?.removeAllRanges(); }}>Seçimi temizle</button></div> : <p className="reading-instruction">Yazıdan bir metin seç. Sonra fosforlu kalem, alt çizgi veya not ekle düğmesini kullan.</p>}
      {writing && <form className="reading-note-form" onSubmit={(event) => { event.preventDefault(); add("note"); }}>
        <label htmlFor="reading-note-input">Bu alıntı için notun</label><textarea id="reading-note-input" ref={noteInput} rows={4} maxLength={maxNoteLength} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Aklında kalan bir düşünce…" />
        <div><button type="button" className="reading-text-button" onClick={() => { setWriting(false); setNote(""); }}>Vazgeç</button><button className="reading-save" disabled={disabled || !note.trim()}>Notu kaydet</button></div>
      </form>}
      {marks.length >= maxMarks && <p className="reading-availability">Bu yazı için {maxMarks} kayıt sınırına ulaştın. Yeni işaret eklemek için bir kaydı kaldır.</p>}
      <div className="reading-list-heading"><h3>Kayıtların</h3><span>{marks.length}</span></div>
      {marks.length === 0 ? <p className="reading-empty">Henüz işaret veya not yok. İlk satırı sen seç.</p> : <ol className="reading-mark-list">{marks.map((mark, index) => <li key={mark.id} className={`reading-mark mark-${mark.kind}`}>
        <div className="reading-mark-meta"><span>{kindLabels[mark.kind]}</span><button onClick={() => remove(mark, index)} aria-label={`${index + 1}. kaydı kaldır`}>Kaldır</button></div>
        <button className="reading-quote-link" onClick={() => jump(mark)} aria-label={`${index + 1}. alıntının bulunduğu bölüme git`}><q>{mark.fragments.map((fragment) => fragment.quote).join("\n")}</q><span aria-hidden="true">↗</span></button>
        {mark.note && <p className="reading-authored-note">{mark.note}</p>}
      </li>)}</ol>}
      {undo && <button className="reading-undo" onClick={() => { const restored = [...marks]; restored.splice(undo.index, 0, undo.mark); persist(restored, "Kaldırılan işaret geri alındı.", { create: undo.mark }); setUndo(null); }}>Son kaldırmayı geri al ↶</button>}
      <footer>{server ? <>Hesabına bağlı · yalnız sen görürsün</> : <>Hesapsız kullanım · yalnızca bu cihaz/tarayıcı<br />Giriş yapıp e-postanı doğrularsan notların hesabında saklanır.</>}</footer>
    </section>}
    {storageError && <p className="reading-feedback reading-storage-error" role="alert">{storageError}</p>}
    <p className={`reading-feedback ${status ? "has-message" : ""}`} role="status">{status}</p>
  </aside>;
}
