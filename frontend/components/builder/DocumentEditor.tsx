"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArticleSeriesContext } from "./ArticleSeriesContext";
import { InlineSeriesForm } from "./InlineSeriesForm";
import { DocumentActions } from "./DocumentActions";
import { articleStatus, statusLabels, type ContentStatus } from "../../lib/editorial/store";
import { StudioHeader } from "./StudioHeader";
import type { ReactNode } from "react";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { parseDocumentDraft, type DocumentDraft, type StudioTarget } from "../../lib/builder/document-protocol";
import type { Article } from "../../lib/content";
import { slugifySeriesTitle, type BlogSeries } from "../../lib/series/model";
import { scrollBehavior } from "../../lib/motion";
import { CanvasToolbar } from "./CanvasToolbar";
import { PreviewCanvas } from "./PreviewCanvas";
import { ArticleProperties, articleFields } from "./ArticleProperties";
import { SeriesProperties, seriesFields } from "./SeriesProperties";
export function DocumentEditor({ navigation, initial, articles, series, isNew = false, onDirty, onNavigate, onSave, onDiscard, onCreateSeries, error }: { navigation?: ReactNode; initial: DocumentDraft; articles: readonly Article[]; series: readonly BlogSeries[]; isNew?: boolean; onDirty: (dirty: boolean) => void; onNavigate: (target: StudioTarget) => void; onSave: (draft: DocumentDraft, seriesId?: string | null) => boolean; onCreateSeries: (series: BlogSeries) => boolean; onDiscard: () => void; error: string | null }) {
  const { workspace, ready } = useWorkspace();
  const inspectorRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<DocumentDraft>(() => structuredClone(initial));
  const [baseline, setBaseline] = useState<DocumentDraft | null>(isNew ? null : initial);
  const [slugEdited, setSlugEdited] = useState(false);
  const [field, setField] = useState("title");
  const [request, setRequest] = useState(0);
  const [mobile, setMobile] = useState(false);
  const [editing, setEditing] = useState(true);
  const [message, setMessage] = useState("");
  const initialSeriesId = initial.kind === "article" ? series.find((s) => s.status !== "trashed" && s.articleSlugs.includes(initial.article.slug))?.id ?? null : null;
  const [seriesId, setSeriesId] = useState(initialSeriesId);
  const [savedSeriesId, setSavedSeriesId] = useState(initialSeriesId);
  const [creatingSeries, setCreatingSeries] = useState(false);
  const [seriesFormDirty, setSeriesFormDirty] = useState(false);
  const seriesFormRef = useRef<HTMLDivElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline) || seriesId !== savedSeriesId || seriesFormDirty;
  const status = draft.kind === "article" ? articleStatus(draft.article) : draft.series.status;
  const canPublish = draft.kind === "article" ? draft.article.paragraphs.some((p) => p.trim()) : draft.series.articleSlugs.length > 0;
  useEffect(() => { if (creatingSeries) seriesFormRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() }); }, [creatingSeries]);
  const valid = parseDocumentDraft(draft);
  const missingBody = (status === "published" || status === "scheduled") && !canPublish;
  const [preview, setPreview] = useState(initial);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) { event.preventDefault(); event.returnValue = ""; }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => { const next = parseDocumentDraft(draft); if (next) setPreview(next); }, [draft]);
  const fields = draft.kind === "article" ? articleFields : seriesFields;
  const title = draft.kind === "article" ? draft.article.title : draft.series.title;
  const label = fields.find(([id]) => id === field)?.[1] ?? "Seçili paragraf";
  function select(id: string, fromCanvas = false) {
    setField(id); setEditing(true); setRequest((n) => n + 1);
    if (fromCanvas && window.innerWidth <= 860) inspectorRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
    else if (!fromCanvas && window.innerWidth <= 1100) canvasRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }
  function change(next: DocumentDraft) {
    if (!baseline && draft.kind === next.kind) {
      const oldRecord = draft.kind === "article" ? draft.article : draft.series;
      const record = next.kind === "article" ? next.article : next.series;
      if (record.slug !== oldRecord.slug) setSlugEdited(true);
      else if (!slugEdited && record.title !== oldRecord.title) {
        const slug = slugifySeriesTitle(record.title) || oldRecord.slug;
        next = next.kind === "article" ? { kind: "article", article: { ...next.article, slug } } : { kind: "series", series: { ...next.series, slug } };
      }
    }
    setDraft(next); setMessage("");
    if (next.kind === "article" && field.startsWith("paragraph-") && Number(field.slice(10)) >= next.article.paragraphs.length) setField("body");
  }
  function save(nextStatus: ContentStatus = status) {
    if (draft.kind === "series" && nextStatus === "scheduled") return;
    const next: DocumentDraft = draft.kind === "article" ? { kind: "article", article: { ...draft.article, status: nextStatus, scheduledAt: nextStatus === "scheduled" ? draft.article.scheduledAt : undefined } } : { kind: "series", series: { ...draft.series, status: nextStatus as BlogSeries["status"] } };
    if (onSave(next, draft.kind === "article" ? seriesId : undefined)) {
      setDraft(next); setBaseline(structuredClone(next)); setSavedSeriesId(seriesId); onDirty(false);
      setMessage(nextStatus === "scheduled" ? "Yayın planı bu tarayıcıda kaydedildi. Otomatik yayınlama sunucu bağlantısıyla gelecek." : nextStatus === "trashed" ? "Çöp kutusuna taşındı. İçerik işlemlerinden geri yükleyebilirsin." : nextStatus === "archived" ? "Arşivlendi; ziyaretçi görünümünde gizlendi." : nextStatus === "draft" ? "Taslak kaydedildi; ziyaretçi görünümünde gizli." : "Bu tarayıcıda yayınlandı.");
    }
  }
  function closeSeriesForm() {
    setCreatingSeries(false); setSeriesFormDirty(false);
    canvasRef.current?.scrollIntoView({ block: "start", behavior: scrollBehavior() });
  }
  function revert() {
    if (!baseline) { onDiscard(); return; }
    setDraft(structuredClone(baseline)); setSeriesId(savedSeriesId); setCreatingSeries(false); setSeriesFormDirty(false); setMessage("Düzenlemeler geri alındı.");
  }
  return <main className="studio document-studio">
    <StudioHeader navigation={navigation} status={<span className={`studio-state status-${status}`} title={dirty ? "Kaydedilmemiş değişiklikler var" : "Kaydedildi"}>{statusLabels[status]}{dirty ? " · düzenleniyor" : ""}</span>} actions={<>
      {baseline && (baseline.kind === "article" ? articleStatus(baseline.article) : baseline.series.status) === "published" && <Link className="studio-text-link" href={baseline.kind === "article" ? `/yazilar/${baseline.article.slug}` : `/seriler/${baseline.series.slug}`} target="_blank" aria-label="Kaydedilmiş sayfayı aç ↗" title="Kaydedilmiş sayfayı aç">↗</Link>}
      <button className="studio-secondary" disabled={!dirty} onClick={revert} aria-label="Değişiklikleri geri al" title="Değişiklikleri geri al">↶</button>
      <DocumentActions status={status} disabled={!ready || !valid || creatingSeries} canPublish={canPublish} onSave={save} onSchedule={draft.kind === "article" ? () => select("publication") : undefined} />
      <button className="studio-primary" disabled={!ready || !dirty || !valid || missingBody || creatingSeries} onClick={() => save()}>Sayfayı kaydet ↗</button>
    </>} />

    <div className="studio-workspace">
      <aside className="studio-sidebar" aria-label="Sayfa alanları"><span className="studio-eyebrow">SAYFA ALANLARI</span><h2>İçerik ve düzen</h2><nav className="document-field-list">{fields.map(([id, name]) => <button key={id} aria-pressed={field === id || (id === "body" && field.startsWith("paragraph-"))} onClick={() => select(id)}>{name}<span aria-hidden="true">↗</span></button>)}</nav><p className="property-note">Ziyaretçinin gördüğü sayfa üzerinde çalışıyorsun. Sayfadaki bağlantılar ilgili yazıyı veya seriyi tuvale getirir.</p></aside>
      <section ref={canvasRef} className="studio-preview" aria-label="Canlı sayfa tuvali"><CanvasToolbar title={title} mobile={mobile} editing={editing} onMobile={setMobile} onEditing={setEditing} />{draft.kind === "article" && <ArticleSeriesContext series={series} selectedId={seriesId} creating={creatingSeries} onSelect={(id) => { setSeriesId(id); setCreatingSeries(false); setSeriesFormDirty(false); }} onCreate={() => setCreatingSeries(true)} />}<p role="status" className="studio-status">{missingBody ? "Yazını kaydetmek için en az bir paragraf ekle." : !valid ? "Eksik veya geçersiz alan var. Tuval son geçerli düzenlemeyi gösteriyor." : message}</p><PreviewCanvas workspace={workspace} document={preview} mobile={mobile} selection={{ id: field, request, editing }} onSelect={(id) => select(id, true)} onNavigate={onNavigate} />{creatingSeries && <div ref={seriesFormRef} className="inline-series-anchor"><InlineSeriesForm onDirty={setSeriesFormDirty} onCancel={closeSeriesForm} onSave={(record) => { if (!onCreateSeries(record)) return false; setSeriesId(record.id); closeSeriesForm(); setMessage("Seri oluşturuldu ve seçildi. Yazını kaydettiğinde ilk bölümü olacak."); return true; }} />{error && <p role="alert" className="studio-error">{error}</p>}</div>}</section>
      <aside ref={inspectorRef} className="studio-inspector inspector-linked" aria-label="Seçili alanın ayarları"><span className="studio-eyebrow">SEÇİLİ ALAN</span><h2>{label}</h2><fieldset className="inspector-fields" disabled={!ready}>{draft.kind === "article" ? <ArticleProperties onSchedule={() => save("scheduled")} onCancelSchedule={() => save("draft")} scheduleDisabled={!ready || !valid || !canPublish || creatingSeries} allowSlugEdit={!baseline} article={draft.article} field={field} onChange={(article) => change({ kind: "article", article })} /> : <SeriesProperties series={draft.series} collection={series} articles={articles} field={field} onChange={(item) => change({ kind: "series", series: item })} />}</fieldset>{!creatingSeries && error && <p role="alert" className="studio-error">{error}</p>}<p className="property-note">Site genelindeki renk ve tipografi, ana sayfanın Tema tasarımı alanından yönetilir.</p></aside>
    </div>
  </main>;
}
