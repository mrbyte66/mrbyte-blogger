"use client";

import { useState } from "react";
import { articles } from "../../lib/content";
import { createSeries, SERIES_LEVELS, seriesValidationError, slugifySeriesTitle, type BlogSeries } from "../../lib/series/model";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import "../../app/series-studio.css";

function copySeries(series: BlogSeries): BlogSeries { return { ...series, articleSlugs: [...series.articleSlugs] }; }

export function SeriesStudio() {
  const { series, save, ready, error } = useSeriesWorkspace();
  const [draft, setDraft] = useState<BlogSeries | null>(null);
  const [original, setOriginal] = useState<BlogSeries | null>(null);
  const [slugEdited, setSlugEdited] = useState(false);
  const [message, setMessage] = useState("");
  const [validation, setValidation] = useState("");
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(original);
  const occupied = new Map(series.filter((item) => item.id !== draft?.id).flatMap((item) => item.articleSlugs.map((slug) => [slug, item.title] as const)));
  function open(item: BlogSeries) { setDraft(copySeries(item)); setOriginal(copySeries(item)); setSlugEdited(true); setValidation(""); setMessage(""); }
  function update(change: Partial<BlogSeries>) { if (draft) { setDraft({ ...draft, ...change }); setValidation(""); setMessage(""); } }
  function create() { setDraft(createSeries()); setOriginal(null); setSlugEdited(false); setValidation(""); setMessage(""); }
  function cancel() { setDraft(original ? copySeries(original) : null); setValidation(""); setMessage(""); }
  function persist() {
    if (!draft) return;
    const next = series.some((item) => item.id === draft.id) ? series.map((item) => item.id === draft.id ? draft : item) : [...series, draft];
    const invalid = seriesValidationError(next);
    if (invalid) { setValidation(invalid); return; }
    if (!save(next)) { setValidation("Seri kaydedilemedi. Düzenlemelerin burada duruyor; tekrar deneyebilirsin."); return; }
    setOriginal(copySeries(draft));
    setMessage(draft.status === "published" ? "Seri bu tarayıcıda ziyaretçi görünümüne açıldı." : "Seri taslak olarak bu tarayıcıya kaydedildi.");
  }
  function move(index: number, direction: -1 | 1) {
    if (!draft) return;
    const articleSlugs = [...draft.articleSlugs];
    const target = index + direction;
    if (target < 0 || target >= articleSlugs.length) return;
    [articleSlugs[index], articleSlugs[target]] = [articleSlugs[target], articleSlugs[index]];
    update({ articleSlugs });
  }

  return <section className="series-studio" aria-label="Seri içeriklerini yönet">
    <span className="studio-eyebrow">03 / İÇERİK KOLEKSİYONU</span>
    <h2>Seriler</h2>
    <p className="property-summary">Yazılarını sıralı bir yolculukta birleştir. Seriler temadan bağımsızdır; aynı yazı tek bir seride yer alır.</p>
    <div className="series-studio-list" aria-label="Mevcut seriler">{series.map((item) => <button key={item.id} aria-pressed={draft?.id === item.id} disabled={!ready || (dirty && draft?.id !== item.id)} onClick={() => { if (draft?.id !== item.id) open(item); }}><strong>{item.title}</strong><span>{item.articleSlugs.length} bölüm · {item.status === "draft" ? "Taslak" : item.ongoing ? "Devam ediyor" : "Tamamlandı"}</span></button>)}</div>
    <button className="studio-secondary series-create" disabled={!ready || dirty} onClick={create}>＋ Yeni seri oluştur</button>
    {!series.length && !draft && <p className="property-note">Henüz bir seri yok. Yeni bir seri oluşturup mevcut yazılarını ekleyebilirsin.</p>}
    {draft && <div className="series-studio-form">
      <div className="series-edit-heading"><h3>{original ? "Seriyi düzenle" : "Yeni seri"}</h3><span>{dirty ? "Kaydedilmemiş değişiklikler" : "Kaydedildi"}</span></div>
      <label className="studio-field"><span>Seri adı</span><input value={draft.title} maxLength={160} onChange={(event) => update({ title: event.target.value, ...(!slugEdited ? { slug: slugifySeriesTitle(event.target.value) } : {}) })} /></label>
      <label className="studio-field"><span>Kalıcı bağlantı adı</span><input aria-label="Kalıcı bağlantı adı" value={draft.slug} maxLength={100} spellCheck={false} onChange={(event) => { setSlugEdited(true); update({ slug: event.target.value }); }} /><small>/seriler/{draft.slug || "seri-adi"} · Küçük harf, rakam ve tire.</small></label>
      <label className="studio-field"><span>Kısa açıklama</span><textarea rows={3} maxLength={600} value={draft.summary} onChange={(event) => update({ summary: event.target.value })} /></label>
      <label className="studio-field"><span>Seviye</span><select value={draft.level} onChange={(event) => update({ level: event.target.value as BlogSeries["level"] })}>{SERIES_LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label>
      <div className="series-publication">
        <label className="studio-field"><span>Görünürlük</span><select value={draft.status} onChange={(event) => update({ status: event.target.value as BlogSeries["status"] })}><option value="draft">Taslak · ziyaretçiden gizli</option><option value="published">Ziyaretçiye açık</option></select></label>
        <label className="studio-field"><span>Serinin durumu</span><select value={draft.ongoing ? "ongoing" : "completed"} onChange={(event) => update({ ongoing: event.target.value === "ongoing" })}><option value="ongoing">Devam ediyor</option><option value="completed">Tamamlandı</option></select></label>
      </div>
      <section className="series-chapter-editor" aria-labelledby="series-chapters-heading"><div className="series-edit-heading"><h3 id="series-chapters-heading">Bölüm sırası</h3><span>{draft.articleSlugs.length} bölüm</span></div>
        {!draft.articleSlugs.length && <p className="property-note">Aşağıdaki yazılardan ilk bölümü ekle. Ziyaretçiye açmak için en az bir bölüm gerekir.</p>}
        <ol>{draft.articleSlugs.map((slug, index) => { const article = articles.find((item) => item.slug === slug); return <li key={slug}><div><span className="series-chapter-number">{String(index + 1).padStart(2, "0")}</span><strong>{article?.title ?? slug}</strong></div><div className="series-chapter-actions"><button aria-label={`${article?.title ?? slug} bölümünü yukarı taşı`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button aria-label={`${article?.title ?? slug} bölümünü aşağı taşı`} disabled={index === draft.articleSlugs.length - 1} onClick={() => move(index, 1)}>↓</button><button className="series-membership-remove" aria-label={`${article?.title ?? slug} yazısını seriden çıkar`} onClick={() => update({ articleSlugs: draft.articleSlugs.filter((item) => item !== slug) })}>Çıkar</button></div></li>; })}</ol>
        <p className="series-helper">Seriden çıkarmak yazıyı silmez. Bölüm sırası yazının kendi bağlantısını değiştirmez.</p>
      </section>
      <section className="series-article-picker" aria-label="Seriye yazı ekle"><h3>Yazı ekle</h3>{articles.filter((article) => !draft.articleSlugs.includes(article.slug)).map((article) => <button key={article.slug} disabled={occupied.has(article.slug)} onClick={() => update({ articleSlugs: [...draft.articleSlugs, article.slug] })}><span><strong>{article.title}</strong><small>{occupied.has(article.slug) ? `“${occupied.get(article.slug)}” serisinde` : `${article.category} · ${article.minutes} dk`}</small></span><span aria-hidden="true">{occupied.has(article.slug) ? "✓" : "+"}</span></button>)}</section>
      {validation && <p className="series-form-error" role="alert">{validation}</p>}
      <div className="series-form-actions"><button className="studio-secondary" onClick={cancel} disabled={!dirty}>Vazgeç</button><button className="studio-primary" onClick={persist} disabled={!ready || !dirty}>Seriyi kaydet ↗</button></div>
      {dirty && <p className="series-helper">Başka bir seri seçmeden önce kaydet veya vazgeç. Tema uygulaması bu içerik kaydından ayrıdır.</p>}
    </div>}
    <p role="status" className="series-save-status">{message || (!ready ? "Seriler yükleniyor…" : "")}</p>
    {error && <p className="series-form-error" role="alert">{error}</p>}
  </section>;
}
