"use client";

import { useEffect, useRef, useState } from "react";
import { anchorRange, findAnchor, maxMarks, maxNoteLength, selectionAnchors, type ReadingMark, type ReadingMarkKind, type TextAnchor } from "../../lib/reading/model";
import { readReadingDocument, writeReadingDocument } from "../../lib/reading/storage";

type HighlightEnvironment = {
  CSS?: { highlights?: { set: (name: string, highlight: unknown) => void; delete: (name: string) => void } };
  Highlight?: new (...ranges: Range[]) => unknown;
};
const highlightNames = { highlight: "mrbyte-reading-highlight", underline: "mrbyte-reading-underline", note: "mrbyte-reading-note" };
const kindLabels = { highlight: "Fosforlu işaret", underline: "Alt çizgi", note: "Not" };

export function ReadingTools({ articleId, contentRootId }: { articleId: string; contentRootId: string }) {
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
  const noteInput = useRef<HTMLTextAreaElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const quote = fragments.map((fragment) => fragment.quote).join("\n");

  useEffect(() => {
    const loaded = readReadingDocument(articleId);
    setMarks(loaded.document.marks); setStorageError(loaded.error); setReady(true);
    setFragments([]); setWriting(false); setUndo(null); setStatus("");
  }, [articleId]);
  useEffect(() => {
    function capture() {
      const root = document.getElementById(contentRootId);
      if (!root) return;
      const next = selectionAnchors(root, window.getSelection());
      if (next.length) { setFragments(next); setStatus(""); }
    }
    document.addEventListener("selectionchange", capture);
    return () => document.removeEventListener("selectionchange", capture);
  }, [contentRootId]);
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
  }, [marks, contentRootId]);

  function persist(next: ReadingMark[], message: string) {
    const saved = writeReadingDocument({ version: 1, articleId, marks: next });
    setMarks(next);
    setStorageError(saved ? null : "Tarayıcı kaydı başarısız. Bu değişiklikler sayfa kapanınca kaybolabilir.");
    setStatus(saved ? `${message} Bu tarayıcıya kaydedildi.` : `${message} Yalnızca bu oturumda tutuluyor.`);
  }
  function add(kind: ReadingMarkKind) {
    if (!ready || !fragments.length || marks.length >= maxMarks || (kind === "note" && !note.trim())) return;
    const mark: ReadingMark = { id: crypto.randomUUID(), kind, fragments, note: kind === "note" ? note.trim() : "", createdAt: new Date().toISOString() };
    persist([...marks, mark], `${kindLabels[kind]} eklendi.`);
    setFragments([]); setNote(""); setWriting(false); setUndo(null);
    window.getSelection()?.removeAllRanges();
  }
  function remove(mark: ReadingMark, index: number) {
    persist(marks.filter((item) => item.id !== mark.id), "İşaret kaldırıldı.");
    setUndo({ mark, index });
  }
  function jump(mark: ReadingMark) {
    const root = document.getElementById(contentRootId);
    const paragraph = root && findAnchor(root, mark.fragments[0].anchorId);
    if (!paragraph) { setStatus("Bu alıntının bölümü artık bulunamıyor. Kayıtlı notun listede korunuyor."); return; }
    if (matchMedia("(max-width: 1100px)").matches) setOpen(false);
    paragraph.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
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
      <header><p className="reading-eyebrow">KİŞİSEL OKUMA ALANI</p><h2>Satır aralarında.</h2><p>Notların bu tarayıcıda sana ait. Site sahibiyle veya diğer okurlarla paylaşılmaz.</p></header>
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
      {undo && <button className="reading-undo" onClick={() => { const restored = [...marks]; restored.splice(undo.index, 0, undo.mark); persist(restored, "Kaldırılan işaret geri alındı."); setUndo(null); }}>Son kaldırmayı geri al ↶</button>}
      <footer>Hesapsız kullanım · yalnızca bu cihaz/tarayıcı<br />Kalıcı hesap eşitlemesi henüz yok.</footer>
    </section>}
    {storageError && <p className="reading-feedback reading-storage-error" role="alert">{storageError}</p>}
    <p className={`reading-feedback ${status ? "has-message" : ""}`} role="status">{status}</p>
  </aside>;
}
