"use client";
import { useState } from "react";
import type { Article } from "../../lib/content";
import { createArticle } from "../../lib/articles/model";
import { describe } from "../../lib/api/http";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";
import { createSeries, type BlogSeries } from "../../lib/series/model";
import type { DocumentDraft, StudioTarget } from "../../lib/builder/document-protocol";
import { PageNavigator } from "./PageNavigator";
import { ThemeEditor } from "./ThemeEditor";
import { DocumentEditor } from "./DocumentEditor";
import { announceContentChange } from "../data/PublicContentRefresh";

const leaveMessage = "Kaydedilmemiş değişiklikler var. Kaydetmeden bu sayfadan çıkmak istiyor musun?";
/** Asks before discarding unsaved edits; environments without dialogs keep the edits. */
function confirmLeave(): boolean { try { return window.confirm(leaveMessage) === true; } catch { return false; } }

export function SiteEditor() {
  const content = useContentWorkspace();
  const [target, setTarget] = useState<StudioTarget>({ kind: "home" });
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [newArticle, setNewArticle] = useState<Article | null>(null);
  // A new series is an unsaved draft on the live canvas, like a new article; it is created on its first Save.
  const [newSeries, setNewSeries] = useState<BlogSeries | null>(null);
  const availableArticles = newArticle ? [...content.articles, newArticle] : content.articles;
  const availableSeries = newSeries ? [...content.series, newSeries] : content.series;
  function navigate(next: StudioTarget) {
    if (JSON.stringify(next) === JSON.stringify(target)) return;
    if (dirty && !confirmLeave()) { setNotice("Sayfa değiştirmeden önce düzenlemelerini kaydet veya geri al."); return; }
    if (next.kind === "article" && !availableArticles.some((a) => a.slug === next.slug)) return;
    if (next.kind === "series" && !availableSeries.some((s) => s.slug === next.slug)) return;
    // Leaving an unsaved new article or series discards it (it was never stored).
    if (newArticle && !(next.kind === "article" && next.slug === newArticle.slug)) setNewArticle(null);
    if (newSeries && !(next.kind === "series" && next.slug === newSeries.slug)) setNewSeries(null);
    setTarget(next); setNotice(""); setSaveError(null); setDirty(false);
  }
  const article = target.kind === "article" ? availableArticles.find((a) => a.slug === target.slug) : undefined;
  const series = target.kind === "series" ? availableSeries.find((s) => s.slug === target.slug) : undefined;
  const initial: DocumentDraft | null = article ? { kind: "article", article } : series ? { kind: "series", series } : null;
  async function save(draft: DocumentDraft, seriesId?: string | null): Promise<boolean> {
    if (!content.studio) return false;
    try {
      if (draft.kind === "article") {
        const status = draft.article.status ?? "draft";
        const saved = await content.studio.saveArticle(draft.article, { isNew: !!newArticle, seriesId: seriesId ?? null, status, visibility: draft.article.visibility ?? "public" });
        setNewArticle(null); setTarget({ kind: "article", slug: saved.slug });
      } else if (newSeries) {
        // Create the draft first; chapters and a non-draft state then go through the normal series save.
        let saved = await content.studio.createSeries({ ...draft.series, status: "draft", articleSlugs: [] });
        if (draft.series.articleSlugs.length || draft.series.status !== "draft") saved = await content.studio.saveSeries({ ...draft.series, id: saved.id, version: saved.version }, draft.series.status);
        setNewSeries(null); setTarget({ kind: "series", slug: saved.slug });
      } else {
        const saved = await content.studio.saveSeries(draft.series, draft.series.status);
        setTarget({ kind: "series", slug: saved.slug });
      }
      setNotice(""); setSaveError(null);
      announceContentChange();
      return true;
    } catch (cause) {
      setSaveError(`Kaydedilemedi. ${describe(cause)}`);
      return false;
    }
  }
  async function createInlineSeries(record: BlogSeries): Promise<BlogSeries | null> {
    if (!content.studio) return null;
    try { const created = await content.studio.createSeries(record); setSaveError(null); return created; }
    catch (cause) { setSaveError(`Seri oluşturulamadı. ${describe(cause)}`); return null; }
  }
  function addSeries() {
    if (dirty && !confirmLeave()) { setNotice("Yeni bir seri açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    // Same starting point as a new article: a valid template the canvas can render at once.
    const record: BlogSeries = { ...createSeries(), title: "Yeni seri", slug: `yeni-seri-${crypto.randomUUID().slice(0, 8)}` };
    setNewArticle(null); setNewSeries(record); setDirty(false); setTarget({ kind: "series", slug: record.slug }); setNotice(""); setSaveError(null);
  }
  function addArticle() {
    if (dirty && !confirmLeave()) { setNotice("Yeni bir yazı açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    const firstCategory = content.categories?.[0];
    // Writing started from a saved series becomes its next chapter (membership is stored on the article's Save).
    const record = { ...createArticle(), seriesId: target.kind === "series" && !newSeries ? series?.id : undefined, category: firstCategory?.name ?? "", categories: firstCategory ? [firstCategory.name] : [], categoryIds: firstCategory ? [firstCategory.id] : undefined };
    setNewSeries(null); setDirty(false); setNewArticle(record); setTarget({ kind: "article", slug: record.slug }); setNotice(""); setSaveError(null);
  }
  const navigation = <PageNavigator target={target} articles={availableArticles} series={availableSeries} ready={content.ready} onNavigate={navigate} onCreateArticle={addArticle} onCreateSeries={addSeries} />;
  const error = saveError ?? content.error;
  return <div className="studio-site-editor">
    {target.kind === "home" && error && <p role="alert" className="studio-navigation-notice">{error}</p>}
    {notice && <p className="studio-navigation-notice" role="status">{notice}</p>}
    {!content.ready ? <p role="status" className="studio-navigation-notice">Studio içerikleri yükleniyor…</p>
      : target.kind === "home" ? <ThemeEditor navigation={navigation} onNavigate={navigate} /> : initial ? <DocumentEditor
      navigation={navigation} key={`${target.kind}-${target.slug}`} initial={initial} isNew={target.kind === "article" ? !!newArticle : !!newSeries}
      articles={content.articles} series={content.series} onCreateSeries={createInlineSeries}
      onDirty={setDirty} onNavigate={navigate} onSave={save}
      onDiscard={() => { setNewArticle(null); setNewSeries(null); setDirty(false); setTarget({ kind: "home" }); setNotice(""); setSaveError(null); }} error={error}
    /> : <p role="status">Sayfa yükleniyor…</p>}
  </div>;
}
