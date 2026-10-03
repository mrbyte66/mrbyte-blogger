"use client";

import { useArticles } from "../lib/articles/use-articles";
import { useReducer } from "react";
import { useSitePreferences } from "./SitePreferences";
import { Character } from "./Character";
import { ContentPanel } from "./ContentPanel";
import { initialNavigation, navigateArticles, type Section, type Navigation, type NavigationAction } from "../lib/navigation";

const destinations: { section: Section; number: string; label: string; detail: string }[] = [
  { section: "writing", number: "01", label: "Yazılar", detail: "DÜŞÜNCELER & NOTLAR" },
  { section: "projects", number: "02", label: "Projeler", detail: "KOD & DENEYLER" },
  { section: "about", number: "03", label: "Hakkımda", detail: "EKRANIN ARKASINDAKİ" },
];

export function Experience({ siteName = "SATIR", title = "Kod yazarım.", emphasis = "Bazen de satır.", description = "Yazılım, edebiyat ve\nikisinin arasında bir insan.", headingLevel = "h1", colorMode = "remember" }: { siteName?: string; title?: string; emphasis?: string; description?: string; headingLevel?: "h1" | "h2"; colorMode?: "light" | "dark" | "remember" }) {
  const Heading = headingLevel;
  const { articles } = useArticles();
  const featured = articles.find((a) => a.slug === "yapay-zeka-ile-dusunmek")!;
  const [navigation, dispatch] = useReducer((state: Navigation, action: NavigationAction) => navigateArticles(state, action, articles), initialNavigation);
  const { colorMode: preference, setColorMode, motionEnabled, setMotionEnabled } = useSitePreferences();
  const dark = preference ? preference === "dark" : colorMode === "dark";

  return <section aria-label="Karakterli evren" className={`experience ${dark ? "theme-dark" : "theme-light"} ${motionEnabled ? "motion-on" : "motion-off"} ${navigation.section ? "panel-open" : ""}`}>
    <a className="skip-link" href="#scene-navigation">İçeriklere geç</a>
    <div className="stage-texture" aria-hidden="true" />
    <header className="site-header"><button className="wordmark" aria-label={`${siteName} ana sahne`} onClick={() => dispatch({ type: "close" })}>{siteName}<span>.</span></button><span className="header-description">KİŞİSEL BİR EVREN</span></header>

    <div className="scene">
      <span className="scene-coordinate" aria-hidden="true">FIG. 001 — İNSAN / MAKİNE</span>
      <div className="scene-halo" aria-hidden="true" />
      <div className="scene-word" aria-hidden="true">merak.</div>
      <Character motionEnabled={motionEnabled} />

      <div className="introduction"><p className="eyebrow"><span className="tiny-cross" aria-hidden="true">+</span> MERHABA, DÜNYA.</p><Heading className="scene-heading">{title}<br /><em>{emphasis}</em></Heading><p className="intro-description" style={{ whiteSpace: "pre-line" }}>{description}</p><div className="intro-line" aria-hidden="true" /></div>

      <nav id="scene-navigation" className="scene-navigation" aria-label="Ana içerikler"><p className="navigation-label">NEREYE GİDELİM?</p>{destinations.map((destination) => <button key={destination.section} className="destination" onClick={() => dispatch({ type: "open", section: destination.section })}><span className="destination-number">{destination.number}</span><span className="destination-copy"><span className="destination-label">{destination.label}</span><span className="destination-detail">{destination.detail}</span></span><span className="destination-plus" aria-hidden="true">+</span></button>)}</nav>

      <button className="latest-note" data-article={featured.slug} onClick={() => dispatch({ type: "article", slug: "yapay-zeka-ile-dusunmek" })}><span className="note-icon" aria-hidden="true">[ ]</span><span><span className="latest-label">DEFTERDEN BİR SAYFA</span><span className="latest-title">{featured.title}</span></span><span className="latest-plus" aria-hidden="true">+</span></button>
      <div className="character-caption" aria-hidden="true"><span className="caption-line" /><span>Kıvırcık düşünceler.<br />Düzenli satırlar.</span></div>
    </div>

    <footer className="site-footer"><span className="footer-signature">HER ŞEY BİR MERAKLA BAŞLAR.</span><span className="scene-indicator"><span aria-hidden="true">✳</span> BURADASIN</span><div className="scene-controls"><button aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"} aria-pressed={dark} onClick={() => setColorMode(dark ? "light" : "dark")}><span className="sun-icon" aria-hidden="true">☼</span><span>Işıklar {dark ? "kapalı" : "açık"}</span></button><span className="control-divider" /><button aria-label="Sahne hareketi" aria-pressed={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}><span className={`motion-icon ${motionEnabled ? "playing" : ""}`} aria-hidden="true"><i /><i /><i /></span><span className="motion-label">{motionEnabled ? "Hareket açık" : "Hareket kapalı"}</span></button></div></footer>
    <ContentPanel navigation={navigation} dispatch={dispatch} siteName={siteName} />
  </section>;
}
