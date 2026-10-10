"use client";
import { useEffect, useId, useRef, useState } from "react";
import { createSeries, slugifySeriesTitle, validateSeries, type BlogSeries } from "../../lib/series/model";
import { TextField } from "./ArticleProperties";
import { CoverField } from "./CoverSearch";

export function InlineSeriesForm({ onSave, onCancel, onDirty }: { onSave: (series: BlogSeries) => Promise<boolean>; onCancel: () => void; onDirty: (dirty: boolean) => void }) {
  const [draft, setDraft] = useState(createSeries);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [customSlug, setCustomSlug] = useState(false);
  const headingId = useId();
  const root = useRef<HTMLElement>(null);
  useEffect(() => { root.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); }, []);
  const valid = !!validateSeries([draft]);
  function update(next: BlogSeries) { setDraft(next); onDirty(true); }
  async function save() {
    if (!valid || savingRef.current) return;
    savingRef.current = true; setSaving(true);
    try { if (await onSave(draft)) onDirty(false); }
    finally { savingRef.current = false; setSaving(false); }
  }
  return <section aria-busy={saving} ref={root} className="inline-series-form" aria-labelledby={headingId}>
    <header><div><span className="studio-eyebrow">YAZININ SERİSİ</span><h2 id={headingId}>Yeni bir seri başlat</h2><p>Kaydettiğinde seri seçilir; yazını düzenlemeye devam edersin.</p></div><button type="button" disabled={saving} onClick={onCancel} aria-label="Yeni seri formunu kapat">×</button></header>
    <fieldset disabled={saving} className="inline-series-fields">
      <TextField label="Yeni seri başlığı" value={draft.title} onChange={(title) => update({ ...draft, title, slug: customSlug ? draft.slug : slugifySeriesTitle(title) })} />
      <TextField label="Yeni seri bağlantısı" value={draft.slug} onChange={(slug) => { setCustomSlug(true); update({ ...draft, slug }); }} />
      <div className="settings-full"><TextField label="Yeni seri açıklaması" multiline value={draft.summary} onChange={(summary) => update({ ...draft, summary })} /></div>
      <div className="settings-full"><CoverField cover={draft.coverImage} resource={null} suggestedQuery={draft.title} previewAlt="Seri kapağı önizlemesi" onChange={(coverImage) => update({ ...draft, coverImage })} /></div>
      <label className="document-checkbox"><input type="checkbox" checked={draft.ongoing} onChange={(e) => update({ ...draft, ongoing: e.target.checked })} />Devam eden seri</label>
    </fieldset>
    <footer><span>Seri taslak olarak kaydedilir. İlk bölümünü yayınladığında seri de yayına alınır.</span><button className="studio-secondary" disabled={saving} onClick={onCancel}>Vazgeç</button><button className="studio-primary" disabled={!valid || saving} onClick={save}>{saving ? "Kaydediliyor…" : "Seriyi kaydet"}</button></footer>
  </section>;
}
