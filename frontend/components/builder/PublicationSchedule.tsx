"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Article } from "../../lib/content";
function localDateTime(value?: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return "";
  const d = new Date(value); const part = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${part(d.getMonth() + 1)}-${part(d.getDate())}T${part(d.getHours())}:${part(d.getMinutes())}`;
}
export function PublicationSchedule({ article, onChange, onSchedule, onCancel, disabled }: { article: Article; onChange: (article: Article) => void; onSchedule?: () => void; onCancel?: () => void; disabled: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const planned = article.status === "scheduled";
  const valid = !!article.scheduledAt && Date.parse(article.scheduledAt) > now;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <div className="publication-schedule">
    <label className="studio-field"><span>Yayın tarihi ve saati</span><input type="datetime-local" aria-describedby="schedule-hint" value={localDateTime(article.scheduledAt)} min={localDateTime(new Date(now + 60_000).toISOString())} onChange={e => {
      const date = new Date(e.target.value);
      onChange({ ...article, scheduledAt: Number.isFinite(date.getTime()) ? date.toISOString() : undefined });
    }} /></label>
    <p id="schedule-hint" className="property-note">Saat dilimi: {zone}. Gelecekte bir tarih ve saat seç.</p>
    {article.scheduledAt && !valid && <p role="alert" className="studio-error">Bu saat geçti. Yeni bir yayın zamanı seç.</p>}
    <p className="property-note">Plan kaydedildiğinde yazı ziyaretçilerden gizlenir. Otomatik yayınlama sunucu bağlantısıyla devreye girecek.</p>
    <button type="button" className="studio-primary" disabled={disabled || !valid || !onSchedule} onClick={onSchedule}>{planned ? "Yayın planını güncelle" : "Yayın planını kaydet"}</button>
    {planned && <button type="button" className="studio-secondary" disabled={!onCancel} onClick={onCancel}>Planı iptal et · taslağa dön</button>}
    <p className="property-note">Yayınlandığında e-posta alma tercihi tüm yazılarını kapsar. <Link href="/hesap" target="_blank">Hesap → Bildirimler ↗</Link></p>
  </div>;
}
