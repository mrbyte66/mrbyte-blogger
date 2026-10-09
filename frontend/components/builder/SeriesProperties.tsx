"use client";
import type { Article } from "../../lib/content";
import { insertChapterByCreation } from "../../lib/articles/metadata";
import { type BlogSeries } from "../../lib/series/model";
import { TextField } from "./ArticleProperties";
import { articleStatus, statusLabels } from "../../lib/editorial/store";
import { CoverField } from "./CoverSearch";
/** A series can go live only with at least one published, public chapter (API rule `SERIES_EMPTY`). */
export function hasPublicChapter(series: BlogSeries, articles: readonly Article[]) {
  return articles.some((article) => series.articleSlugs.includes(article.slug) && articleStatus(article) === "published" && article.visibility !== "private");
}
/** Marks chapters that would not be visible to visitors yet, so the owner can tell them apart in the picker. */
function chapterState(article: Article) {
  const status = articleStatus(article);
  return [status !== "published" ? statusLabels[status].toLocaleLowerCase("tr") : "", article.visibility === "private" ? "özel" : ""].filter(Boolean).map((label) => ` · ${label}`).join("");
}
export const seriesFields = [["title", "Seri başlığı"], ["summary", "Açıklama"], ["cover", "Kapak görseli"], ["chapters", "Bölümler"], ["meta", "Seri bilgileri"], ["layout", "Sayfa düzeni"]] as const;
export function SeriesProperties({ series, collection, articles, field, onChange }: { series: BlogSeries; collection: readonly BlogSeries[]; articles: readonly Article[]; field: string; onChange: (s: BlogSeries) => void }) {
  const update = (change: Partial<BlogSeries>) => onChange({ ...series, ...change });
  const layout = series.presentation ?? { heading: "left", chapterStyle: "cards" };
  if (field === "title") return <TextField label="Seri başlığı" value={series.title} onChange={(title) => update({ title })} />;
  if (field === "summary") return <TextField label="Seri açıklaması" multiline value={series.summary} onChange={(summary) => update({ summary })} />;
  if (field === "cover") return <CoverField cover={series.coverImage} resource={series.version === undefined ? null : { type: "series", id: series.id, version: series.version }} suggestedQuery={series.title} previewAlt="Seri kapağı önizlemesi" onChange={(coverImage) => update({ coverImage })} />;
  if (field === "layout") return <><label className="studio-field"><span>Başlık hizası</span><select value={layout.heading} onChange={(e) => update({ presentation: { ...layout, heading: e.target.value as "left" | "center" } })}><option value="left">Sola hizalı</option><option value="center">Ortalanmış</option></select></label><label className="studio-field"><span>Bölüm görünümü</span><select value={layout.chapterStyle} onChange={(e) => update({ presentation: { ...layout, chapterStyle: e.target.value as "cards" | "rows" } })}><option value="cards">Kartlar</option><option value="rows">Editoryal satırlar</option></select></label></>;
  // Lifecycle changes only through the ••• actions (as for articles), so the header always shows the real state.
  if (field === "meta") return <><TextField label="Kalıcı bağlantı adı" value={series.slug} onChange={(slug) => update({ slug })} /><p className="property-note">Durum: {statusLabels[series.status]}. Yayına almak, taslağa çekmek, arşivlemek veya silmek için üstteki ••• menüsünü kullan.</p>{series.status === "published" && !hasPublicChapter(series, articles) && <p className="property-note" role="note">Seri listede görünmüyor: yayında bölüm yok. En az bir herkese açık bölüm yayınla.</p>}<label className="document-checkbox"><input type="checkbox" checked={series.ongoing} onChange={(e) => update({ ongoing: e.target.checked })} />Yeni bölümler gelecek</label></>;
  const occupied = new Set(collection.filter((s) => s.id !== series.id).flatMap((s) => s.articleSlugs));
  return <><ol className="document-chapter-list">{series.articleSlugs.map((slug, index) => <li key={slug}><strong>{articles.find((a) => a.slug === slug)?.title}</strong><div className="document-order">{([-1, 1] as const).map((direction) => <button key={direction} disabled={index + direction < 0 || index + direction >= series.articleSlugs.length} aria-label={`Bölüm ${index + 1} ${direction === -1 ? "yukarı" : "aşağı"}`} onClick={() => { const slugs = [...series.articleSlugs]; [slugs[index], slugs[index + direction]] = [slugs[index + direction], slugs[index]]; update({ articleSlugs: slugs }); }}>{direction === -1 ? "↑" : "↓"}</button>)}<button onClick={() => update({ articleSlugs: series.articleSlugs.filter((s) => s !== slug) })}>Seriden çıkar</button></div></li>)}</ol><label className="studio-field"><span>Bölüm ekle</span><select value="" onChange={(e) => { const article = articles.find((item) => item.slug === e.target.value); if (article) update({ articleSlugs: insertChapterByCreation(series.articleSlugs, article, articles) }); }}><option value="">Yazı seç</option>{articles.filter((a) => !series.articleSlugs.includes(a.slug)).map((a) => <option value={a.slug} key={a.slug} disabled={occupied.has(a.slug)}>{a.title}{chapterState(a)}{occupied.has(a.slug) ? " · başka seride" : ""}</option>)}</select></label><p className="property-note">Tuvalde bir bölüme tıklayarak o yazının düzenleme sayfasına geçebilirsin.</p></>;
}
