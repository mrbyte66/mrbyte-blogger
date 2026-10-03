"use client";
import { useState } from "react";
import type { Article } from "../../lib/content";
import { createArticle } from "../../lib/articles/model";
import { PageNavigator } from "./PageNavigator";
import { useArticles } from "../../lib/articles/use-articles";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import { createSeries, type BlogSeries } from "../../lib/series/model";
import type { DocumentDraft, StudioTarget } from "../../lib/builder/document-protocol";
import { ThemeEditor } from "./ThemeEditor";
import { DocumentEditor } from "./DocumentEditor";
export function SiteEditor() {
  const articleWorkspace = useArticles(); const seriesWorkspace = useSeriesWorkspace();
  const [target, setTarget] = useState<StudioTarget>({ kind: "home" });
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [newSeries, setNewSeries] = useState<BlogSeries | null>(null);
  const [newArticle, setNewArticle] = useState<Article | null>(null);
  const availableArticles = newArticle ? [...articleWorkspace.articles, newArticle] : articleWorkspace.articles;
  const availableSeries = newSeries ? [...seriesWorkspace.series, newSeries] : seriesWorkspace.series;
  function navigate(next: StudioTarget) {
    if (JSON.stringify(next) === JSON.stringify(target)) return;
    if (dirty) { setNotice("Sayfa değiştirmeden önce düzenlemelerini kaydet veya geri al."); return; }
    if (next.kind === "article" && !availableArticles.some((a) => a.slug === next.slug)) return;
    if (next.kind === "series" && !availableSeries.some((s) => s.slug === next.slug)) return;
    setTarget(next); setNotice(""); setDirty(false);
  }
  const article = target.kind === "article" ? availableArticles.find((a) => a.slug === target.slug) : undefined;
  const series = target.kind === "series" ? availableSeries.find((s) => s.slug === target.slug) : undefined;
  const initial: DocumentDraft | null = article ? { kind: "article", article } : series ? { kind: "series", series } : null;
  function save(draft: DocumentDraft) {
    if (draft.kind === "article") {
      const saved = articleWorkspace.save(draft.article, !!newArticle);
      if (saved) { setNewArticle(null); setNotice(""); setTarget({ kind: "article", slug: draft.article.slug }); }
      return saved;
    }
    const exists = seriesWorkspace.series.some((s) => s.id === draft.series.id);
    const next = exists ? seriesWorkspace.series.map((s) => s.id === draft.series.id ? draft.series : s) : [...seriesWorkspace.series, draft.series];
    if (!seriesWorkspace.save(next)) return false;
    setNewSeries(null); setNotice(""); setTarget({ kind: "series", slug: draft.series.slug }); return true;
  }
  function addSeries() {
    if (dirty) { setNotice("Yeni bir seri açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    const record = { ...createSeries(), title: "Yeni seri", slug: `yeni-seri-${Date.now()}` };
    setNewSeries(record); setTarget({ kind: "series", slug: record.slug }); setNotice("");
  }
  function addArticle() {
    if (dirty) { setNotice("Yeni bir yazı açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    const record = createArticle();
    setNewArticle(record); setTarget({ kind: "article", slug: record.slug }); setNotice("");
  }
  const navigation = <PageNavigator target={target} articles={availableArticles} series={availableSeries} ready={articleWorkspace.ready && seriesWorkspace.ready} onNavigate={navigate} onCreateArticle={addArticle} onCreateSeries={addSeries} />;
  return <div className="studio-site-editor">{notice && <p className="studio-navigation-notice" role="status">{notice}</p>}{target.kind === "home" ? <ThemeEditor navigation={navigation} onNavigate={navigate} /> : initial ? <DocumentEditor navigation={navigation} key={`${target.kind}-${target.slug}`} initial={initial} isNew={target.kind === "article" ? !!newArticle : !!newSeries && series?.id === newSeries.id} articles={articleWorkspace.articles} series={seriesWorkspace.series} onDirty={setDirty} onNavigate={navigate} onSave={save} onDiscard={() => { setNewSeries(null); setNewArticle(null); setDirty(false); setTarget({ kind: "home" }); setNotice(""); }} error={initial.kind === "article" ? articleWorkspace.error : seriesWorkspace.error} /> : <p role="status">Sayfa yükleniyor…</p>}</div>;
}
