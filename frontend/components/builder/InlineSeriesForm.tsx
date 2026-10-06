"use client";
import {MediaUpload} from "./MediaUpload";
import {usePublicData} from "../api/PublicDataProvider";
import { useEffect, useId, useRef, useState } from "react";
import { createSeries, slugifySeriesTitle, validateSeries, type BlogSeries } from "../../lib/series/model";
import { TextField } from "./ArticleProperties";

export function InlineSeriesForm({ onSave, onCancel, onDirty }: { onSave: (series: BlogSeries) => boolean | Promise<boolean>; onCancel: () => void; onDirty: (dirty: boolean) => void }) {
  const apiMode=!!usePublicData();
  const [draft, setDraft] = useState(createSeries);
  const [customSlug, setCustomSlug] = useState(false);
  const headingId = useId();
  const root = useRef<HTMLElement>(null);
  useEffect(() => { root.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); }, []);
  const [saving,setSaving]=useState(false);
  const valid = !!validateSeries([draft]);
  function update(next: BlogSeries) { setDraft(next); onDirty(true); }
  return <section ref={root} className="inline-series-form" aria-labelledby={headingId}>
    <header><div><span className="studio-eyebrow">YAZININ SERİSİ</span><h2 id={headingId}>Yeni bir seri başlat</h2><p>Kaydettiğinde seri seçilir; yazını düzenlemeye devam edersin.</p></div><button type="button" onClick={onCancel} aria-label="Yeni seri formunu kapat">×</button></header>
    <div className="inline-series-fields">
      <TextField label="Yeni seri başlığı" value={draft.title} onChange={(title) => update({ ...draft, title, slug: customSlug ? draft.slug : slugifySeriesTitle(title) })} />
      <TextField label="Yeni seri bağlantısı" value={draft.slug} onChange={(slug) => { setCustomSlug(true); update({ ...draft, slug }); }} />
      <div className="settings-full"><TextField label="Yeni seri açıklaması" multiline value={draft.summary} onChange={(summary) => update({ ...draft, summary })} /></div>
      <div className="settings-full">{apiMode&&<MediaUpload onUpload={coverImage=>update({...draft,coverImage})}/>}<TextField label="Yeni seri kapak görseli" value={draft.coverImage ?? ""} onChange={(coverImage) => update({ ...draft, coverImage })} /></div>
      {draft.coverImage && <figure className="inline-series-cover settings-full"><img src={draft.coverImage} alt="Seri kapağı önizlemesi" /><figcaption>Kapak önizlemesi</figcaption></figure>}
      <label className="document-checkbox"><input type="checkbox" checked={draft.ongoing} onChange={(e) => update({ ...draft, ongoing: e.target.checked })} />Devam eden seri</label>
    </div>
    <footer><span>İlk yazı yayınlanana kadar seri taslak kalır. Kapak için site içi yol veya HTTPS adresi kullan.</span><button className="studio-secondary" onClick={onCancel}>Vazgeç</button><button className="studio-primary" disabled={!valid || saving} onClick={() => {setSaving(true);const finish=(saved:boolean)=>{setSaving(false);if(saved)onDirty(false);};const result=onSave(draft);if(result instanceof Promise)void result.then(finish).catch(()=>setSaving(false));else finish(result);}}>Seriyi kaydet</button></footer>
  </section>;
}
