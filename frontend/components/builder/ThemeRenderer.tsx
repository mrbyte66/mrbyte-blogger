"use client";
import { usePublicData } from "../api/PublicDataProvider";
import { SitePageHeader } from "../SitePageHeader";
import { AccountMenu } from "../auth/AccountMenu";

import { scrollBehavior } from "../../lib/motion";

import { SlideLink as Link } from "../SlideLink";
import { useEffect, useRef, useState } from "react";
import { publicArticles } from "../../lib/editorial/store";
import { articleCategories, articleDate, formatArticleDate } from "../../lib/articles/metadata";
import { useArticles } from "../../lib/articles/use-articles";
import { blockLabels, parseWorkspace, type Workspace, type PageBlock, type Theme } from "../../lib/builder/model";
import { themeAppearance } from "../../lib/builder/appearance";
import { isSceneField, type SceneField, parseCanvasSelection, previewEvents, type CanvasSelection } from "../../lib/builder/preview-protocol";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { ThemeToggle } from "../SitePreferences";
import { Experience } from "../Experience";
import { SaveArticleButton, SavedLibraryLink } from "../saved/SaveArticleButton";
import { ClapCount } from "../ClapCount";
import { ViewCount } from "../ViewCount";
import { SeriesCatalog } from "../series/SeriesCatalog";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import { DocumentPreview } from "./DocumentPreview";
import { documentEvent, navigateEvent, parseDocumentDraft, targetFromLink, type DocumentDraft } from "../../lib/builder/document-protocol";
import { useProgressiveItems } from "../../lib/use-progressive-items";
import { useVisibleArticleView } from "../../lib/reactions/use-views";
import type { Article } from "../../lib/content";

type ArticlesBlock = Extract<PageBlock, { kind: "articles" }>;
function FeedArticle({ article, index, preview }: { article: Article; index: number; preview: boolean }) {
  const view = useVisibleArticleView(article.slug, !preview);
  return <div className="feed-article-wrap"><Link ref={view.attach} className="feed-article" href={`/yazilar/${article.slug}`} target={preview ? "_blank" : undefined}>
    <span className="feed-index">{String(index + 1).padStart(2, "0")}</span>
    <div><div className="feed-meta"><span>{articleCategories(article).join(" · ")}</span><time dateTime={articleDate(article)}>{formatArticleDate(article)}</time><span>{article.minutes} dk okuma</span><ViewCount slugs={[article.slug]} /><ClapCount slugs={[article.slug]} /></div><h3>{article.title}</h3><p>{article.excerpt}</p></div>
    <span className="feed-arrow" aria-hidden="true">↗</span>
  </Link><SaveArticleButton slug={article.slug} title={article.title} preview={preview} /></div>;
}
function ArticleFeed({ block, preview }: { block: ArticlesBlock; preview: boolean }) {
  const data = usePublicData();
  const { articles: storedArticles } = useArticles();
  const articles = publicArticles(storedArticles);
  const items = articles.filter((item) => block.category === "Tümü" || articleCategories(item).includes(block.category));
  const progressive = block.loading === "progressive";
  const feed = useProgressiveItems({ total: progressive ? items.length : 0, listKey: `${block.id}-${block.category}` });
  const more = progressive && feed.hasMore;
  return <section className="theme-section feed-section" id="yazilar" aria-labelledby={`${block.id}-title`}>
    <div className="section-kicker"><span>01 / DÜŞÜNCELER & NOTLAR</span><span>{String(items.length).padStart(2, "0")} YAZI</span></div>
    <div className="feed-heading"><h2 id={`${block.id}-title`}>{block.title}</h2><span className="feed-sample">{items.length} yazı</span></div>
    <div className={`feed-list feed-${block.display}`}>
      {(progressive ? items.slice(0, feed.visible) : items).map((article, index) => <FeedArticle article={article} index={index} preview={preview} key={article.slug} />)}
    </div>
    <div ref={feed.sentinel} className="feed-end" aria-live="polite">{more ? <button onClick={feed.loadMore}>Sonraki 5 yazıyı göster ↓</button> : data && !preview ? <Link href="/yazilar">Bütün yazıları gör ↗</Link> : <span>Şimdilik defterin sonuna geldin. <span aria-hidden="true">✳</span></span>}</div>
  </section>;
}

export function ThemeNavigation({ theme, preview = false }: { theme: Theme; preview?: boolean }) {
  const links = [{ kind: "articles", id: "yazilar", label: "Yazılar" }, { kind: "series", id: "seriler", label: "Seriler" }, { kind: "projects", id: "projeler", label: "Projeler" }, { kind: "about", id: "hakkimda", label: "Hakkımda" }];
  return <header className="theme-header"><a className="theme-wordmark" href="#top">{theme.siteName}<span>.</span></a><nav aria-label="Site menüsü">{links.filter((link) => theme.blocks.some((block) => block.kind === link.kind)).map((link) => <a key={link.id} href={`#${link.id}`}>{link.label}</a>)}</nav><ThemeToggle defaultDark={theme.surface === "night"} />{!preview && <><SavedLibraryLink /><AccountMenu /></>}<span className="theme-header-note">KİŞİSEL BİR DEFTER <span aria-hidden="true">✳</span></span></header>;
}

function SeriesBlock({ block }: { block: Extract<PageBlock, { kind: "series" }> }) {
  const data = usePublicData();
  const { series } = useSeriesWorkspace();
  return <section className={`theme-section series-block series-block-${block.display}`} id="seriler" aria-labelledby={`${block.id}-title`}>
    <p className="editorial-eyebrow">ADIM ADIM / OKUMA YOLLARI</p>
    <h2 id={`${block.id}-title`}>{block.title}</h2>
    <SeriesCatalog series={series} />
    {data && <Link className="text-button" href="/seriler">Bütün serileri gör ↗</Link>}
  </section>;
}

function BlockContent({ block, theme, primaryTitle, preview, editing }: { block: PageBlock; theme: Theme; primaryTitle?: string; preview: boolean; editing: boolean }) {
      switch (block.kind) {
        case "header": return <ThemeNavigation theme={theme} preview={preview} />;
        case "intro": {
          const Heading = primaryTitle === block.id ? "h1" : "h2";
          return <section className={`theme-section editorial-intro intro-${block.layout}`}>
          <p className="editorial-eyebrow"><span aria-hidden="true">↳</span> {block.eyebrow}</p><Heading>{block.title}</Heading><div className="editorial-intro-bottom"><p>{block.description}</p><span className="editorial-orbit" aria-hidden="true">✳</span></div>
        </section>;
        }
        case "scene": return <Experience editing={editing} key={`${block.id}-${theme.surface}`} colorMode={theme.surface === "night" ? "dark" : theme.surface === "warm" ? "light" : "remember"} headingLevel={primaryTitle === block.id ? "h1" : "h2"} siteName={theme.siteName} title={block.title} emphasis={block.emphasis} description={block.description} featuredArticleSlug={block.featuredArticleSlug} showFeaturedArticle={block.showFeaturedArticle} featuredSeriesSlug={block.featuredSeriesSlug} showFeaturedSeries={block.showFeaturedSeries} />;
        case "articles": return <ArticleFeed key={`${block.id}-${block.category}-${block.loading}`} block={block} preview={preview} />;
        case "series": return <SeriesBlock block={block} />;
        case "quote": return <section className={`theme-section theme-quote quote-${block.display}`}><blockquote><p><span className="quote-mark" aria-hidden="true">“</span>{block.text}<span className="quote-mark" aria-hidden="true">”</span></p><cite>{block.attribution}</cite></blockquote></section>;
        case "about": return <section className="theme-section theme-about" id="hakkimda" aria-labelledby={`${block.id}-title`}><p className="editorial-eyebrow">EKRANIN DİĞER TARAFINDA</p><h2 id={`${block.id}-title`}>{block.title}</h2><p>{block.text}</p></section>;
        case "projects": return <section className="theme-section theme-projects" id="projeler" aria-labelledby={`${block.id}-title`}><p className="editorial-eyebrow">KOD & DENEYLER</p><h2 id={`${block.id}-title`}>{block.title}</h2><div className="project-empty"><span aria-hidden="true">[ _ ]</span><p>İlk deney için yer hazır.<br /><small>Henüz proje eklenmedi.</small></p></div></section>;
        case "footer": return <footer className="theme-section theme-footer"><a href="#top">{theme.siteName}<span>.</span></a><p>{block.text}</p><a className="footer-top" href="#top">Başa dön ↑</a></footer>;
      }
}

export function ThemeRenderer({ theme, preview = false, selection, onSelect }: { theme: Theme; preview?: boolean; selection?: CanvasSelection; onSelect?: (id: string, field?: SceneField) => void }) {
  const primaryTitle = theme.blocks.find((block) => block.kind === "scene" || block.kind === "intro")?.id;
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const appearance = themeAppearance(theme);
  const editing = selection?.editing ?? false;
  const selectedExists = theme.blocks.some((block) => block.id === selection?.id);
  useEffect(() => {
    if (!editing || !selection?.id || !selectedExists) return;
    nodes.current.get(selection.id)?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
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
      onClickCapture={editing ? (event) => { event.preventDefault(); event.stopPropagation(); const target = event.target as HTMLElement;
        const field = target.closest("[data-scene-field]")?.getAttribute("data-scene-field");
        if (block.kind === "scene" && !isSceneField(field) && !target.closest(".introduction, .canvas-block-label") && target !== event.currentTarget) return;
        if (isSceneField(field)) onSelect?.(block.id, field); else onSelect?.(block.id);
      } : undefined}
      onKeyDown={editing ? (event) => { if (event.target === event.currentTarget && ["Enter", " "].includes(event.key)) { event.preventDefault(); onSelect?.(block.id); } } : undefined}
    >
      {editing && <span className="canvas-block-label">{blockLabels[block.kind]} <span>· Düzenlemek için seç</span></span>}
      <BlockContent block={block} theme={theme} primaryTitle={primaryTitle} preview={preview} editing={editing} />
    </div>)}
  </main>;
}

export function PublishedSite() {
  const { workspace } = useWorkspace();
  return workspace.applied.blocks.length ? <ThemeRenderer theme={workspace.applied} /> : <main className="theme-site"><SitePageHeader theme={workspace.applied} /><div className="reading-content"><h1>{workspace.applied.siteName}</h1><p>Henüz yayımlanmış bir ana sayfa düzeni yok.</p></div></main>;
}

export function DraftPreview({ embedded = false }: { embedded?: boolean }) {
  const { workspace, storageError } = useWorkspace();
  const [previewWorkspace, setPreviewWorkspace] = useState<Workspace | null>(null);
  const currentWorkspace = embedded && previewWorkspace ? previewWorkspace : workspace;
  const [document, setDocument] = useState<DocumentDraft | null>(null);
  const [selection, setSelection] = useState<CanvasSelection>({ id: null, request: 0, editing: embedded });
  useEffect(() => {
    if (!embedded) return;
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== window.location.origin) return;
      if (event.data?.type === previewEvents.workspace && typeof event.data.workspace === "string") {
        const next = parseWorkspace(event.data.workspace);
        if (next) setPreviewWorkspace(next);
      }
      if (event.data?.type === documentEvent) { if (event.data.document === null) setDocument(null); else { const parsed = parseDocumentDraft(event.data.document); if (parsed) setDocument(parsed); } }
      const next = parseCanvasSelection(event.data);
      if (next) setSelection(next);
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: previewEvents.ready }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, [embedded]);
  function select(id: string, field?: SceneField) { window.parent.postMessage({ type: previewEvents.select, id, ...(field ? { field } : {}) }, window.location.origin); }
  return <div onClickCapture={embedded ? (event) => {
    if (selection.editing) return;
    const node = event.target as HTMLElement;
    const link = node.closest("a");
    const articleSlug = node.closest("[data-article]")?.getAttribute("data-article");
    const seriesSlug = node.closest("[data-series]")?.getAttribute("data-series");
    const destination = targetFromLink(articleSlug ? `/yazilar/${articleSlug}` : seriesSlug ? `/seriler/${seriesSlug}` : link?.getAttribute("href") ?? "");
    if (destination) { event.preventDefault(); event.stopPropagation(); window.parent.postMessage({ type: navigateEvent, target: destination }, window.location.origin); }
  } : undefined}>
    {!embedded && <div className="preview-bar"><Link href="/studio">← Stüdyoya dön</Link><span>TASLAK ÖNİZLEME · {workspace.draft.name}</span><span>Henüz uygulanmadı</span></div>}
    {storageError && <p role="alert" className="preview-warning">{storageError}</p>}
    {document ? <DocumentPreview draft={document} theme={currentWorkspace.draft} selection={selection} onSelect={select} /> : <ThemeRenderer theme={currentWorkspace.draft} preview selection={embedded ? selection : undefined} onSelect={embedded ? select : undefined} />}
  </div>;
}
