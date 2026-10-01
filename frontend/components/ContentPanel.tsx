"use client";

import { useEffect, useRef, useState, type Dispatch } from "react";
import { articles, filterArticles, findArticle, topics, type Article } from "../lib/content";
import type { Navigation, NavigationAction } from "../lib/navigation";

const sectionNames = { writing: "Yazılar", projects: "Projeler", about: "Hakkımda" };

function CodeBlock({ code }: { code: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
    } catch { setStatus("error"); }
  }
  return <div className="code-block">
    <div className="code-toolbar"><span>JAVA</span><button onClick={copy}>{status === "copied" ? "Kopyalandı" : "Kodu kopyala"}</button></div>
    <pre><code>{code}</code></pre>
    <span className="copy-status" role="status">{status === "error" ? "Kopyalanamadı. Kodu seçerek kopyalayabilirsin." : ""}</span>
  </div>;
}

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  return <article className="article-view">
    <button className="back-button" onClick={onBack}><span aria-hidden="true">‹</span> Bütün yazılar</button>
    <p className="eyebrow">{article.eyebrow}</p>
    <h2 id="panel-title">{article.title}</h2>
    <div className="article-meta"><span>Örnek yazı</span><span>{article.minutes} dk okuma</span></div>
    <p className="article-lead">{article.excerpt}</p>
    {article.paragraphs.map((paragraph, index) => <div key={paragraph}>
      <p>{paragraph}</p>
      {index === 2 && article.code && <CodeBlock code={article.code} />}
    </div>)}
    <div className="article-end"><span aria-hidden="true">✳</span><p>Şimdilik bu kadar.<br />Bir sonraki satırda görüşürüz.</p></div>
    <p className="sample-note">Bu metin, okuma deneyimini göstermek için hazırlanmış bir örnektir.</p>
  </article>;
}

export function ContentPanel({ navigation, dispatch }: { navigation: Navigation; dispatch: Dispatch<NavigationAction> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);
  const previousNavigation = useRef(navigation);
  const article = navigation.articleSlug ? findArticle(navigation.articleSlug) : undefined;

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
      } else if (previous.articleSlug !== navigation.articleSlug || previous.section !== navigation.section) {
        container.scrollTop = 0;
        const heading = container.querySelector<HTMLElement>("#panel-title");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }
    }
    previousNavigation.current = navigation;
  }, [navigation]);

  function openArticle(slug: string) {
    listScroll.current = scrollArea.current?.scrollTop ?? 0;
    dispatch({ type: "article", slug });
  }

  return <dialog ref={dialog} className="content-dialog" aria-labelledby="panel-title"
    onCancel={(event) => { event.preventDefault(); dispatch({ type: "close" }); }}
    onClick={(event) => { if (event.target === event.currentTarget) dispatch({ type: "close" }); }}>
    <div className="panel-shell">
      <div className="panel-topbar"><span className="panel-mark">SATIR<span>.</span></span><span className="panel-location">{navigation.section ? sectionNames[navigation.section] : ""}</span><button className="close-button" aria-label="İçeriği kapat" onClick={() => dispatch({ type: "close" })}><span aria-hidden="true">×</span></button></div>
      <div className="panel-scroll" ref={scrollArea}>
        {navigation.section === "writing" && (article ? <ArticleView key={article.slug} article={article} onBack={() => dispatch({ type: "back" })} /> : <section className="writing-view">
          <p className="eyebrow">DÜŞÜNCELERİN KAYNAK KODU</p>
          <div className="section-heading"><h2 id="panel-title">Açık<br /><em>sekme.</em></h2><span className="item-count">{String(articles.length).padStart(2, "0")} NOT</span></div>
          <p className="section-intro">Koddan cümleye. Aklımda kalanlar, öğrendiklerim, peşine düştüklerim.</p>
          <div className="topic-filter" role="group" aria-label="Yazı kategorisi">{topics.map((topic) => <button key={topic} aria-pressed={topic === navigation.topic} onClick={() => dispatch({ type: "filter", topic })}>{topic}</button>)}</div>
          <div className="article-list">{filterArticles(navigation.topic).map((item, index) => <button className="article-card" data-article={item.slug} key={item.slug} onClick={() => openArticle(item.slug)}>
            <span className="article-number">{String(index + 1).padStart(2, "0")}</span><span className="article-card-main"><span className="article-category">{item.category} <span> / {item.minutes} dk</span></span><span className="article-card-title">{item.title}</span><span className="article-excerpt">{item.excerpt}</span></span><span className="article-plus" aria-hidden="true">+</span>
          </button>)}</div>
          <p className="sample-note">Bu ilk taslakta örnek içerikleri görüyorsun.</p>
        </section>)}
        {navigation.section === "projects" && <section className="projects-view">
          <p className="eyebrow">FİKİRDEN ÇALIŞAN BİR ŞEYE</p>
          <h2 id="panel-title">Deney<br /><em>alanı.</em></h2>
          <p className="section-intro">Küçük araçlar, büyük sorular. Yazılımın oyunla buluştuğu yer.</p>
          <div className="project-placeholder"><span className="project-symbol" aria-hidden="true">[ _ ]</span><h3>İlk deney için yer hazır.</h3><p>Projeler ve canlı demolar burada yer alacak.</p><span className="outline-label">HENÜZ PROJE EKLENMEDİ</span></div>
          <button className="text-button" onClick={() => dispatch({ type: "open", section: "writing" })}>Bu sırada yazılara göz at</button>
        </section>}
        {navigation.section === "about" && <section className="about-view">
          <p className="eyebrow">EKRANIN DİĞER TARAFINDA</p>
          <h2 id="panel-title">Bir insan.<br /><em>Birçok merak.</em></h2>
          <p className="article-lead">Yazılım, yapay zekâ, kitaplar.<br />Bazen aynı cümlenin içinde.</p>
          <p>Kod yazıyorum. Yeni şeyler öğrenmeyi ve öğrendiklerimin üzerine düşünmeyi seviyorum. Bu alan; yazılımın, edebiyatın ve gündelik merakların yan yana durabildiği kişisel bir defter.</p>
          <p>Bir gün teknik bir mesele, başka bir gün bir kitapta takılıp kaldığım satır. Ortak noktaları, biraz daha yakından bakma isteği.</p>
          <div className="about-interests"><span>Yazılım</span><span>Yapay zekâ</span><span>Edebiyat</span><span>Kültür</span></div>
          <p className="sample-note">Tanışma metni taslağı; kişisel anlatımınla birlikte şekillenecek.</p>
        </section>}
      </div>
      <div className="panel-bottom"><span>KOD, KELİME VE ARADAKİLER.</span><span>ESC <span className="escape-label">kapat</span></span></div>
    </div>
  </dialog>;
}
