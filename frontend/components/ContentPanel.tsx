"use client";

import { useEffect, useRef, useState, type Dispatch, type PointerEvent } from "react";
import { topics } from "../lib/content";
import { publicArticles } from "../lib/editorial/store";
import { useArticles } from "../lib/articles/use-articles";
import { useEdgeElasticity } from "../lib/use-edge-elasticity";
import { CoverTransition } from "./CoverTransition";
import { RippleButton } from "./RippleButton";
import { useProgressiveItems } from "../lib/use-progressive-items";
import { SeriesCatalog } from "./series/SeriesCatalog";
import { SeriesArticleNav } from "./series/SeriesArticleNav";
import { useSeriesWorkspace } from "../lib/series/use-series-workspace";
import { ArticleContent } from "./ArticleContent";
import type { Navigation, NavigationAction } from "../lib/navigation";

const sectionNames = { writing: "Yazılar", projects: "Projeler", about: "Hakkımda" };

export function ContentPanel({ navigation, dispatch, siteName = "SATIR" }: { navigation: Navigation; dispatch: Dispatch<NavigationAction>; siteName?: string }) {
  const { series } = useSeriesWorkspace();
  const { articles: storedArticles } = useArticles();
  const articles = publicArticles(storedArticles);
  const [backward, setBackward] = useState(false);
  const [animated, setAnimated] = useState(false);
  const lastAction = useRef<NavigationAction["type"] | null>(null);
  const [chapterLimits, setChapterLimits] = useState<Record<string, number>>({});
  function go(action: NavigationAction, returning = action.type === "back" || (action.type === "series" && !!navigation.articleSlug)) {
    lastAction.current = action.type;
    setAnimated(action.type === "article" || (!!navigation.articleSlug && (action.type === "back" || action.type === "series")));
    setBackward(returning); dispatch(action);
  }
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const previousNavigation = useRef(navigation);
  const [lastOpenNavigation, setLastOpenNavigation] = useState(navigation);
  useEffect(() => { if (navigation.section) setLastOpenNavigation(navigation); }, [navigation]);
  const displayedNavigation = navigation.section ? navigation : lastOpenNavigation;
  const article = displayedNavigation.articleSlug ? articles.find((item) => item.slug === displayedNavigation.articleSlug) : undefined;
  const canGoBack = !!article || !!displayedNavigation.seriesSlug;
  const viewKey = `${displayedNavigation.section}:${displayedNavigation.articleSlug ?? displayedNavigation.seriesSlug ?? displayedNavigation.writingView ?? "articles"}`;
  const filtered = articles.filter((item) => displayedNavigation.topic === "Tümü" || item.category === displayedNavigation.topic);
  const feed = useProgressiveItems({ total: filtered.length, listKey: displayedNavigation.topic, contextKey: viewKey });
  useEdgeElasticity(scrollArea, viewKey);
  const swipe = useRef<{ x: number; y: number; time: number; pointerId: number } | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  function startSwipe(event: PointerEvent<HTMLDivElement>) {
    if (!canGoBack || event.pointerType !== "touch") return;
    swipe.current = { x: event.clientX, y: event.clientY, time: Date.now(), pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = Math.abs(event.clientY - start.y);
    setSwipeProgress(dy <= 32 ? Math.min(1, Math.max(0, dx / 84)) : 0);
  }
  function endSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    setSwipeProgress(0);
    if (start && start.pointerId === event.pointerId && Date.now() - start.time < 1000 && event.clientX - start.x >= 84 && Math.abs(event.clientY - start.y) <= 32) go({ type: "back" });
  }

  useEffect(() => { swipe.current = null; setSwipeProgress(0); }, [navigation.articleSlug]);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (navigation.section && !element.open) element.showModal();
    else if (!navigation.section && element.open) element.close();
  }, [navigation.section]);

  useEffect(() => {
    const previous = previousNavigation.current;
    const container = scrollArea.current;
    if (container && navigation.section) {
      const returningToList = previous.section === "writing" && navigation.section === "writing" && previous.articleSlug && !navigation.articleSlug;
      if (returningToList) {
        container.scrollTop = listScroll.current;
        container.querySelector<HTMLButtonElement>(`[data-article="${previous.articleSlug}"]`)?.focus({ preventScroll: true });
      } else if (previous.articleSlug !== navigation.articleSlug || previous.section !== navigation.section || previous.seriesSlug !== navigation.seriesSlug || previous.writingView !== navigation.writingView) {
        container.scrollTop = 0;
        const heading = container.querySelector<HTMLElement>("#panel-title");
        if (heading && lastAction.current !== "writing-view") {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    }
    previousNavigation.current = navigation;
  }, [navigation]);

  function openArticle(slug: string) {
    if (!article) listScroll.current = scrollArea.current?.scrollTop ?? 0;
    const chapters = series.find((item) => item.articleSlugs.includes(slug) && item.articleSlugs.includes(article?.slug ?? ""))?.articleSlugs;
    go({ type: "article", slug }, !!chapters && chapters.indexOf(slug) < chapters.indexOf(article!.slug));
  }

  function selectTab(view: "articles" | "series") {
    if (view !== (displayedNavigation.writingView ?? "articles") || displayedNavigation.seriesSlug) go({ type: "writing-view", view });
  }

  return <dialog ref={dialog} className="content-dialog" aria-labelledby="panel-title"
    onCancel={(event) => { event.preventDefault(); go({ type: canGoBack ? "back" : "close" }); }}
    onKeyDown={(event) => {
      if (canGoBack && event.altKey && event.key === "ArrowLeft") { event.preventDefault(); go({ type: "back" }); }
    }}
    onClick={(event) => { if (event.target === event.currentTarget) go({ type: "close" }); }}>
    <div className="panel-shell">
      <div className="panel-topbar"><span className="panel-mark">{siteName}<span>.</span></span>
        {displayedNavigation.section === "writing" && !article ? <div className="panel-content-switch"><span className="panel-switch-label">DEFTER</span><div className="writing-tabs" role="tablist" aria-label="Defter içerikleri">{(["articles", "series"] as const).map((view) => {
          const active = (displayedNavigation.writingView ?? "articles") === view;
          return <RippleButton key={view} id={`reader-tab-${view}`} role="tab" aria-selected={active} aria-controls="reader-tabpanel" tabIndex={active ? 0 : -1} onClick={() => selectTab(view)} onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? "articles" : event.key === "End" ? "series" : view === "articles" ? "series" : "articles";
            event.currentTarget.parentElement?.querySelector<HTMLElement>(`#reader-tab-${next}`)?.focus(); selectTab(next);
          }}>{view === "articles" ? "Yazılar" : "Seriler"}</RippleButton>;
        })}</div></div> : canGoBack ? <button className="panel-back" title="Geri dön (Esc veya Alt + ←)" onClick={() => go({ type: "back" })}><span aria-hidden="true">←</span> {displayedNavigation.seriesSlug ? "Bölümlere dön" : "Bütün yazılar"}</button> : <span className="panel-location">{displayedNavigation.section ? sectionNames[displayedNavigation.section] : ""}</span>}
        <button className="close-button" aria-label="İçeriği kapat" onClick={() => go({ type: "close" })}><span aria-hidden="true">×</span></button></div>
      {displayedNavigation.seriesSlug && !article && <div className="panel-context"><button className="panel-back" onClick={() => go({ type: "back" })}>← Bütün seriler</button><span>Bölüm listesi</span></div>}
      {canGoBack && <div className="panel-swipe-edge" aria-hidden="true" onPointerDown={startSwipe} onPointerMove={moveSwipe} onPointerUp={endSwipe} onPointerCancel={() => { swipe.current = null; setSwipeProgress(0); }}><span style={{ transform: `translateX(${swipeProgress * 24}px)`, opacity: .45 + swipeProgress * .55 }}>‹</span></div>}
      <CoverTransition viewKey={viewKey} backward={backward} animate={animated}><div className="panel-scroll" ref={scrollArea} role={displayedNavigation.section === "writing" && !article ? "tabpanel" : undefined} id="reader-tabpanel" aria-labelledby={displayedNavigation.section === "writing" && !article ? `reader-tab-${displayedNavigation.writingView ?? "articles"}` : undefined}><div className="elastic-content">
        {displayedNavigation.section === "writing" && !article && displayedNavigation.writingView === "series" && <section>{!displayedNavigation.seriesSlug && <div className="catalog-heading"><h2 id="panel-title">Seriler</h2><p>Bir konuyu, adım adım.</p></div>}<SeriesCatalog series={series} selectedSeriesSlug={displayedNavigation.seriesSlug ?? undefined} onOpenSeries={(slug) => go({ type: "series", slug })} onOpenArticle={openArticle} chapterLimit={chapterLimits[displayedNavigation.seriesSlug ?? ""] ?? 5} onChapterLimitChange={(count) => setChapterLimits((value) => ({ ...value, [displayedNavigation.seriesSlug ?? ""]: count }))} /></section>}
        {displayedNavigation.section === "writing" && (article || displayedNavigation.writingView !== "series") && (article ? <div key={article.slug}><SeriesArticleNav articleSlug={article.slug} onOpenArticle={openArticle} onOpenSeries={(slug) => go({ type: "series", slug })} /><ArticleContent article={article} /></div> : <section className="writing-view">
          <div className="catalog-heading"><h2 id="panel-title">Yazılar</h2><p>Kod, kelime ve aradakiler.</p><span>{articles.length} yazı</span></div>
          <div className="topic-filter" role="group" aria-label="Yazı kategorisi">{topics.map((topic) => <button key={topic} aria-pressed={topic === displayedNavigation.topic} onClick={() => go({ type: "filter", topic })}>{topic}</button>)}</div>
          <div className="article-list">{filtered.slice(0, feed.visible).map((item, index) => <button className="article-card" data-article={item.slug} key={item.slug} onClick={() => openArticle(item.slug)}>
            <span className="article-number">{String(index + 1).padStart(2, "0")}</span><span className="article-card-main"><span className="article-category">{item.category} <span> / {item.minutes} dk</span></span><span className="article-card-title">{item.title}</span><span className="article-excerpt">{item.excerpt}</span></span><span className="article-plus" aria-hidden="true">+</span>
          </button>)}</div>
          <div className="progressive-footer" ref={feed.sentinel}><span role="status">{feed.visible} / {filtered.length} yazı</span>{feed.hasMore && <button onClick={feed.loadMore}>Sonraki 5 yazıyı göster ↓</button>}</div>
          <p className="sample-note">Bu ilk taslakta örnek içerikleri görüyorsun.</p>
        </section>)}
        {displayedNavigation.section === "projects" && <section className="projects-view">
          <p className="eyebrow">FİKİRDEN ÇALIŞAN BİR ŞEYE</p>
          <h2 id="panel-title">Deney <em>alanı.</em></h2>
          <p className="section-intro">Küçük araçlar, büyük sorular. Yazılımın oyunla buluştuğu yer.</p>
          <div className="project-placeholder"><span className="project-symbol" aria-hidden="true">[ _ ]</span><h3>İlk deney için yer hazır.</h3><p>Projeler ve canlı demolar burada yer alacak.</p><span className="outline-label">HENÜZ PROJE EKLENMEDİ</span></div>
          <button className="text-button" onClick={() => go({ type: "open", section: "writing" })}>Bu sırada yazılara göz at</button>
        </section>}
        {displayedNavigation.section === "about" && <section className="about-view">
          <p className="eyebrow">EKRANIN DİĞER TARAFINDA</p>
          <h2 id="panel-title">Bir insan.<br /><em>Birçok merak.</em></h2>
          <p className="article-lead">Yazılım, yapay zekâ, kitaplar.<br />Bazen aynı cümlenin içinde.</p>
          <p>Kod yazıyorum. Yeni şeyler öğrenmeyi ve öğrendiklerimin üzerine düşünmeyi seviyorum. Bu alan; yazılımın, edebiyatın ve gündelik merakların yan yana durabildiği kişisel bir defter.</p>
          <p>Bir gün teknik bir mesele, başka bir gün bir kitapta takılıp kaldığım satır. Ortak noktaları, biraz daha yakından bakma isteği.</p>
          <div className="about-interests"><span>Yazılım</span><span>Yapay zekâ</span><span>Edebiyat</span><span>Kültür</span></div>
          <p className="sample-note">Tanışma metni taslağı; kişisel anlatımınla birlikte şekillenecek.</p>
        </section>}
      </div></div></CoverTransition>
      <div className="panel-bottom"><span>{canGoBack ? "SOL KENARDAN SAĞA ÇEK · GERİ DÖN" : "KOD, KELİME VE ARADAKİLER."}</span><span>ESC <span className="escape-label">{canGoBack ? "geri dön" : "kapat"}</span></span></div>
    </div>
  </dialog>;
}
