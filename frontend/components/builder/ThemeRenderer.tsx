"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { filterArticles } from "../../lib/content";
import { blockLabels, type PageBlock, type Theme } from "../../lib/builder/model";
import { themeAppearance } from "../../lib/builder/appearance";
import { parseCanvasSelection, previewEvents, type CanvasSelection } from "../../lib/builder/preview-protocol";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { Experience } from "../Experience";

type ArticlesBlock = Extract<PageBlock, { kind: "articles" }>;
function ArticleFeed({ block, preview }: { block: ArticlesBlock; preview: boolean }) {
  const items = filterArticles(block.category);
  const [visible, setVisible] = useState(2);
  const sentinel = useRef<HTMLDivElement>(null);
  const progressive = block.loading === "progressive";
  const more = progressive && visible < items.length;
  useEffect(() => {
    if (!more || !sentinel.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible((count) => Math.min(count + 2, items.length));
    }, { rootMargin: "120px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [more, visible, items.length]);
  return <section className="theme-section feed-section" id="yazilar" aria-labelledby={`${block.id}-title`}>
    <div className="section-kicker"><span>01 / DÜŞÜNCELER & NOTLAR</span><span>{String(items.length).padStart(2, "0")} YAZI</span></div>
    <div className="feed-heading"><h2 id={`${block.id}-title`}>{block.title}</h2><span className="feed-sample">Örnek içerikler</span></div>
    <div className={`feed-list feed-${block.display}`}>
      {(progressive ? items.slice(0, visible) : items).map((article, index) => <Link className="feed-article" key={article.slug} href={`/yazilar/${article.slug}`} target={preview ? "_blank" : undefined}>
        <span className="feed-index">{String(index + 1).padStart(2, "0")}</span>
        <div><div className="feed-meta"><span>{article.category}</span><span>{article.minutes} dk okuma</span></div><h3>{article.title}</h3><p>{article.excerpt}</p></div>
        <span className="feed-arrow" aria-hidden="true">↗</span>
      </Link>)}
    </div>
    <div ref={sentinel} className="feed-end" aria-live="polite">{more ? <button onClick={() => setVisible((count) => Math.min(count + 2, items.length))}>Daha fazla yazı ↓</button> : <span>Şimdilik defterin sonuna geldin. <span aria-hidden="true">✳</span></span>}</div>
  </section>;
}

export function ThemeNavigation({ theme }: { theme: Theme }) {
  const links = [{ kind: "articles", id: "yazilar", label: "Yazılar" }, { kind: "projects", id: "projeler", label: "Projeler" }, { kind: "about", id: "hakkimda", label: "Hakkımda" }];
  return <header className="theme-header"><a className="theme-wordmark" href="#top">{theme.siteName}<span>.</span></a><nav aria-label="Site menüsü">{links.filter((link) => theme.blocks.some((block) => block.kind === link.kind)).map((link) => <a key={link.id} href={`#${link.id}`}>{link.label}</a>)}</nav><span className="theme-header-note">KİŞİSEL BİR DEFTER <span aria-hidden="true">✳</span></span></header>;
}

function BlockContent({ block, theme, primaryTitle, preview }: { block: PageBlock; theme: Theme; primaryTitle?: string; preview: boolean }) {
      switch (block.kind) {
        case "header": return <ThemeNavigation theme={theme} />;
        case "intro": {
          const Heading = primaryTitle === block.id ? "h1" : "h2";
          return <section className={`theme-section editorial-intro intro-${block.layout}`}>
          <p className="editorial-eyebrow"><span aria-hidden="true">↳</span> {block.eyebrow}</p><Heading>{block.title}</Heading><div className="editorial-intro-bottom"><p>{block.description}</p><span className="editorial-orbit" aria-hidden="true">✳</span></div>
        </section>;
        }
        case "scene": return <Experience key={`${block.id}-${theme.surface}`} colorMode={theme.surface === "night" ? "dark" : theme.surface === "warm" ? "light" : "remember"} headingLevel={primaryTitle === block.id ? "h1" : "h2"} siteName={theme.siteName} title={block.title} emphasis={block.emphasis} description={block.description} />;
        case "articles": return <ArticleFeed key={`${block.id}-${block.category}-${block.loading}`} block={block} preview={preview} />;
        case "quote": return <section className={`theme-section theme-quote quote-${block.display}`}><blockquote><p><span className="quote-mark" aria-hidden="true">“</span>{block.text}<span className="quote-mark" aria-hidden="true">”</span></p><cite>{block.attribution}</cite></blockquote></section>;
        case "about": return <section className="theme-section theme-about" id="hakkimda" aria-labelledby={`${block.id}-title`}><p className="editorial-eyebrow">EKRANIN DİĞER TARAFINDA</p><h2 id={`${block.id}-title`}>{block.title}</h2><p>{block.text}</p></section>;
        case "projects": return <section className="theme-section theme-projects" id="projeler" aria-labelledby={`${block.id}-title`}><p className="editorial-eyebrow">KOD & DENEYLER</p><h2 id={`${block.id}-title`}>{block.title}</h2><div className="project-empty"><span aria-hidden="true">[ _ ]</span><p>İlk deney için yer hazır.<br /><small>Henüz proje eklenmedi.</small></p></div></section>;
        case "footer": return <footer className="theme-section theme-footer"><a href="#top">{theme.siteName}<span>.</span></a><p>{block.text}</p><a className="footer-top" href="#top">Başa dön ↑</a></footer>;
      }
}

export function ThemeRenderer({ theme, preview = false, selection, onSelect }: { theme: Theme; preview?: boolean; selection?: CanvasSelection; onSelect?: (id: string) => void }) {
  const primaryTitle = theme.blocks.find((block) => block.kind === "scene" || block.kind === "intro")?.id;
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const appearance = themeAppearance(theme);
  const editing = selection?.editing ?? false;
  const selectedExists = theme.blocks.some((block) => block.id === selection?.id);
  useEffect(() => {
    if (!editing || !selection?.id || !selectedExists) return;
    nodes.current.get(selection.id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [selection?.id, selection?.request, editing, selectedExists]);

  return <main id="top" className={`${appearance.className} ${editing ? "canvas-editing" : ""} ${editing && selectedExists ? "canvas-spotlight" : ""}`} style={appearance.style}>
    {!primaryTitle && <h1 className="visually-hidden">{theme.siteName}</h1>}
    {theme.blocks.length === 0 && <div className="empty-theme"><span aria-hidden="true">＋</span><h2>Boş bir tuval. Yeni bir başlangıç.</h2><p>Stüdyodaki “Blok ekle” düğmesinden ilk bölümünü seç.</p></div>}
    {theme.blocks.map((block) => <div
      key={block.id}
      ref={(node) => { if (node) nodes.current.set(block.id, node); else nodes.current.delete(block.id); }}
      data-block-id={block.id}
      data-block-kind={block.kind}
      className={`theme-block ${selection?.id === block.id ? "is-active" : ""}`}
      role={editing ? "group" : undefined}
      tabIndex={editing ? 0 : undefined}
      aria-label={editing ? `${blockLabels[block.kind]} düzenleme alanı` : undefined}
      onClickCapture={editing ? (event) => { event.preventDefault(); event.stopPropagation(); onSelect?.(block.id); } : undefined}
      onKeyDown={editing ? (event) => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect?.(block.id); } } : undefined}
    >
      {editing && <span className="canvas-block-label">{blockLabels[block.kind]} <span>· Düzenlemek için seç</span></span>}
      <BlockContent block={block} theme={theme} primaryTitle={primaryTitle} preview={preview} />
    </div>)}
  </main>;
}

export function PublishedSite() {
  const { workspace } = useWorkspace();
  return <ThemeRenderer theme={workspace.applied} />;
}

export function DraftPreview({ embedded = false }: { embedded?: boolean }) {
  const { workspace, storageError } = useWorkspace();
  const [selection, setSelection] = useState<CanvasSelection>({ id: null, request: 0, editing: embedded });
  useEffect(() => {
    if (!embedded) return;
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      const next = parseCanvasSelection(event.data);
      if (next) setSelection(next);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: previewEvents.ready }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [embedded]);
  function select(id: string) { window.parent.postMessage({ type: previewEvents.select, id }, window.location.origin); }
  return <>
    {!embedded && <div className="preview-bar"><Link href="/studio">← Stüdyoya dön</Link><span>TASLAK ÖNİZLEME · {workspace.draft.name}</span><span>Henüz uygulanmadı</span></div>}
    {storageError && <p role="alert" className="preview-warning">{storageError}</p>}
    <ThemeRenderer theme={workspace.draft} preview selection={embedded ? selection : undefined} onSelect={embedded ? select : undefined} />
  </>;
}
