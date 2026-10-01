"use client";

import { useEffect, useReducer, useState } from "react";
import { Character } from "./Character";
import { ContentPanel } from "./ContentPanel";
import { initialNavigation, navigate, type Section } from "../lib/navigation";

const destinations: { section: Section; number: string; label: string; detail: string }[] = [
  { section: "writing", number: "01", label: "Yazılar", detail: "DÜŞÜNCELER & NOTLAR" },
  { section: "projects", number: "02", label: "Projeler", detail: "KOD & DENEYLER" },
  { section: "about", number: "03", label: "Hakkımda", detail: "EKRANIN ARKASINDAKİ" },
];

export function Experience() {
  const [navigation, dispatch] = useReducer(navigate, initialNavigation);
  const [dark, setDark] = useState(false);
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      setDark(localStorage.getItem("satir:theme") === "dark");
      const savedMotion = localStorage.getItem("satir:motion");
      setMotionEnabled(savedMotion ? savedMotion === "on" : !matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch { setMotionEnabled(!matchMedia("(prefers-reduced-motion: reduce)").matches); }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      localStorage.setItem("satir:theme", dark ? "dark" : "light");
      localStorage.setItem("satir:motion", motionEnabled ? "on" : "off");
    } catch { /* Private browsing can disable storage. Preferences still work in memory. */ }
  }, [dark, motionEnabled, preferencesLoaded]);

  return <main className={`experience ${dark ? "theme-dark" : "theme-light"} ${motionEnabled ? "motion-on" : "motion-off"} ${navigation.section ? "panel-open" : ""}`}>
    <a className="skip-link" href="#scene-navigation">İçeriklere geç</a>
    <div className="stage-texture" aria-hidden="true" />
    <header className="site-header"><button className="wordmark" aria-label="SATIR ana sahne" onClick={() => dispatch({ type: "close" })}>SATIR<span>.</span></button><span className="header-description">KİŞİSEL BİR EVREN</span><button className="index-button" onClick={() => dispatch({ type: "open", section: "writing" })}><span>Dizini aç</span><span className="index-icon" aria-hidden="true"><i /><i /><i /><i /></span></button></header>

    <div className="scene">
      <span className="scene-coordinate" aria-hidden="true">FIG. 001 — İNSAN / MAKİNE</span>
      <div className="scene-halo" aria-hidden="true" />
      <div className="scene-word" aria-hidden="true">merak.</div>
      <Character motionEnabled={motionEnabled && !navigation.section} />

      <div className="introduction"><p className="eyebrow"><span className="tiny-cross" aria-hidden="true">+</span> MERHABA, DÜNYA.</p><h1>Kod yazarım.<br /><em>Bazen de satır.</em></h1><p className="intro-description">Yazılım, edebiyat ve<br />ikisinin arasında bir insan.</p><div className="intro-line" aria-hidden="true" /></div>

      <nav id="scene-navigation" className="scene-navigation" aria-label="Ana içerikler"><p className="navigation-label">NEREYE GİDELİM?</p>{destinations.map((destination) => <button key={destination.section} className="destination" onClick={() => dispatch({ type: "open", section: destination.section })}><span className="destination-number">{destination.number}</span><span className="destination-copy"><span className="destination-label">{destination.label}</span><span className="destination-detail">{destination.detail}</span></span><span className="destination-plus" aria-hidden="true">+</span></button>)}</nav>

      <button className="latest-note" onClick={() => dispatch({ type: "article", slug: "yapay-zeka-ile-dusunmek" })}><span className="note-icon" aria-hidden="true">[ ]</span><span><span className="latest-label">DEFTERDEN BİR SAYFA</span><span className="latest-title">Yapay zekâ ile düşünmek</span></span><span className="latest-plus" aria-hidden="true">+</span></button>
      <div className="character-caption" aria-hidden="true"><span className="caption-line" /><span>Kıvırcık düşünceler.<br />Düzenli satırlar.</span></div>
    </div>

    <footer className="site-footer"><span className="footer-signature">HER ŞEY BİR MERAKLA BAŞLAR.</span><span className="scene-indicator"><span aria-hidden="true">✳</span> BURADASIN</span><div className="scene-controls"><button aria-label={dark ? "Açık temaya geç" : "Koyu temaya geç"} aria-pressed={dark} onClick={() => setDark(!dark)}><span className="sun-icon" aria-hidden="true">☼</span><span>Işıklar {dark ? "kapalı" : "açık"}</span></button><span className="control-divider" /><button aria-label="Sahne hareketi" aria-pressed={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}><span className={`motion-icon ${motionEnabled ? "playing" : ""}`} aria-hidden="true"><i /><i /><i /></span><span className="motion-label">{motionEnabled ? "Hareket açık" : "Hareket kapalı"}</span></button></div></footer>
    <ContentPanel navigation={navigation} dispatch={dispatch} />
  </main>;
}
