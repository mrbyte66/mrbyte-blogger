"use client";
import { useState } from "react";
import type { Article } from "../../lib/content";
import { createArticle } from "../../lib/articles/model";
import { addDemoSchedules } from "../../lib/editorial/demo-schedules";
import { saveArticleRecord } from "../../lib/editorial/store";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";
import type { BlogSeries } from "../../lib/series/model";
import type { DocumentDraft, StudioTarget } from "../../lib/builder/document-protocol";
import { PageNavigator } from "./PageNavigator";
import { ThemeEditor } from "./ThemeEditor";
import { DocumentEditor } from "./DocumentEditor";

export function SiteEditor() {
  const content = useContentWorkspace();
  const [target, setTarget] = useState<StudioTarget>({ kind: "home" });
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState("");
  const [newArticle, setNewArticle] = useState<Article | null>(null);
  const availableArticles = newArticle ? [...content.articles, newArticle] : content.articles;
  function navigate(next: StudioTarget) {
    if (JSON.stringify(next) === JSON.stringify(target)) return;
    if (dirty) { setNotice("Sayfa değiştirmeden önce düzenlemelerini kaydet veya geri al."); return; }
    if (next.kind === "article" && !availableArticles.some((a) => a.slug === next.slug)) return;
    if (next.kind === "series" && !content.series.some((s) => s.slug === next.slug)) return;
    setTarget(next); setNotice(""); setDirty(false);
  }
  const article = target.kind === "article" ? availableArticles.find((a) => a.slug === target.slug) : undefined;
  const series = target.kind === "series" ? content.series.find((s) => s.slug === target.slug) : undefined;
  const initial: DocumentDraft | null = article ? { kind: "article", article } : series ? { kind: "series", series } : null;
  function finish(saved:DocumentDraft|null) {
    if(!saved)return null;setNewArticle(null);setNotice("");setTarget(saved.kind==="article"?{kind:"article",slug:saved.article.slug}:{kind:"series",slug:saved.series.slug});return saved;
  }
  function save(draft: DocumentDraft, seriesId?: string | null) {
    if(content.apiMode)return Promise.resolve(content.saveDocument(draft,seriesId)).then(finish);
    const ok=content.mutate(current=>draft.kind==="article"?saveArticleRecord(current,draft.article,!!newArticle,seriesId):{...current,series:current.series.map(s=>s.id===draft.series.id?draft.series:s)});return finish(ok?draft:null);
  }
  function createInlineSeries(record: BlogSeries) {
    if(!content.apiMode)return content.mutate(current=>({...current,series:[...current.series,record]}))?record:null;
    return Promise.resolve(content.saveDocument({kind:"series",series:record})).then(result=>result?.kind==="series"?result.series:null);
  }
  function addArticle() {
    if (dirty) { setNotice("Yeni bir yazı açmadan önce düzenlemelerini kaydet veya geri al."); return; }
    const record = createArticle();
    setNewArticle(record); setTarget({ kind: "article", slug: record.slug }); setNotice("");
  }
  function createDemoPlans() {
    if (dirty || newArticle) { setNotice("Demo plan eklemeden önce açık yazını kaydet veya geri al."); return; }
    if (content.mutate(current => addDemoSchedules(current))) setNotice("Demo planlar hazır. Planlanan yazılar listesinden açıp düzenleyebilirsin.");
  }
  const navigation = <PageNavigator target={target} articles={availableArticles} series={content.series} ready={content.ready} onNavigate={navigate} onCreateArticle={addArticle} onCreateDemoPlans={content.apiMode ? undefined : createDemoPlans} />;
  return <div className="studio-site-editor">
    {target.kind === "home" && content.error && <p role="alert" className="studio-navigation-notice">{content.error}</p>}
    {notice && <p className="studio-navigation-notice" role="status">{notice}</p>}
    {target.kind === "home" ? <ThemeEditor navigation={navigation} onNavigate={navigate} /> : initial ? <DocumentEditor
      navigation={navigation} key={`${target.kind}-${target.slug}`} initial={initial} isNew={!!newArticle}
      articles={content.articles} series={content.series} onCreateSeries={createInlineSeries}
      onDirty={setDirty} onNavigate={navigate} onSave={save}
      onDiscard={() => { setNewArticle(null); setDirty(false); setTarget({ kind: "home" }); setNotice(""); }} error={content.error}
    /> : <p role="status">Sayfa yükleniyor…</p>}
  </div>;
}
