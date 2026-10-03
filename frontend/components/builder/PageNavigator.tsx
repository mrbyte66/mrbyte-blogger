"use client";
import { useEffect, useId, useRef, useState } from "react";
import type { Article } from "../../lib/content";
import type { BlogSeries } from "../../lib/series/model";
import type { StudioTarget } from "../../lib/builder/document-protocol";

type Props = {
  target: StudioTarget; articles: readonly Article[]; series: readonly BlogSeries[];
  ready: boolean; onNavigate: (target: StudioTarget) => void;
  onCreateArticle: () => void; onCreateSeries: () => void;
};
export function PageNavigator({ target, articles, series, ready, onNavigate, onCreateArticle, onCreateSeries }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const title = target.kind === "home" ? "Ana sayfa" : target.kind === "article" ? articles.find((a) => a.slug === target.slug)?.title : series.find((s) => s.slug === target.slug)?.title;
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(false); }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); } }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);
  function choose(next: StudioTarget) { onNavigate(next); setOpen(false); setQuery(""); trigger.current?.focus(); }
  function create(action: () => void) { action(); setOpen(false); setQuery(""); trigger.current?.focus(); }
  const matches = (text: string) => text.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr").trim());
  const filteredArticles = articles.filter((a) => matches(a.title));
  const filteredSeries = series.filter((s) => matches(s.title));
  return <div className="studio-page-picker" ref={root}>
    <button className="studio-page-trigger" ref={trigger} aria-label={`Sayfalar: ${title ?? "Sayfa"}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span><small>{target.kind === "home" ? "Site tasarımı" : target.kind === "article" ? "Yazı" : "Seri"}</small><strong>{title ?? "Sayfa"}</strong></span><span aria-hidden="true">⌄</span></button>
    {open && <nav id={id} className="studio-page-menu" aria-label="Sayfalar">
      <div className="page-menu-heading"><strong>Sayfalar</strong><span>{articles.length} yazı · {series.length} seri</span></div>
      <label className="page-search"><span className="sr-only">Sayfa ara</span><input autoFocus value={query} placeholder="Başlığa göre ara…" onChange={(event) => setQuery(event.target.value)} /></label>
      <div className="page-menu-create"><button disabled={!ready} onClick={() => create(onCreateArticle)}>＋ Yeni yazı</button><button disabled={!ready} onClick={() => create(onCreateSeries)}>＋ Yeni seri</button></div>
      <div className="page-menu-list">
        {matches("Ana sayfa") && <button className="page-menu-home" aria-current={target.kind === "home" ? "page" : undefined} onClick={() => choose({ kind: "home" })}><span>Ana sayfa<small>Site tasarımı ve genel tema</small></span><span aria-hidden="true">↗</span></button>}
        {filteredArticles.length > 0 && <section aria-label="Yazılar"><h2>Yazılar</h2>{filteredArticles.map((article) => <button key={article.slug} aria-current={target.kind === "article" && target.slug === article.slug ? "page" : undefined} onClick={() => choose({ kind: "article", slug: article.slug })}>{article.title}</button>)}</section>}
        {filteredSeries.length > 0 && <section aria-label="Seriler"><h2>Seriler</h2>{filteredSeries.map((item) => <button key={item.id} aria-current={target.kind === "series" && target.slug === item.slug ? "page" : undefined} onClick={() => choose({ kind: "series", slug: item.slug })}>{item.title}</button>)}</section>}
        {!filteredArticles.length && !filteredSeries.length && !matches("Ana sayfa") && <p>Bu başlıkta bir sayfa bulunamadı.</p>}
      </div>
    </nav>}
  </div>;
}
