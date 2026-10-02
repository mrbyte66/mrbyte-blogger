"use client";

import { scrollBehavior } from "../../lib/motion";

import Link from "next/link";
import { ThemeToggle } from "../SitePreferences";
import { SeriesStudio } from "../series/SeriesStudio";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyDraft, blockDescriptions, blockLabels, blockPlacementNote,
  cloneTheme, createTheme, removeBlock,
  replaceBlock, restoreApplied, themeErrors, type Starter, type Theme,
} from "../../lib/builder/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { BlockProperties } from "./BlockProperties";
import { PreviewCanvas } from "./PreviewCanvas";
import { ThemeSettings } from "./ThemeSettings";
import { ThemeStructure } from "./ThemeStructure";


export function ThemeEditor() {
  const { workspace, save, ready, storageError } = useWorkspace();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspector, setInspector] = useState<"block" | "theme" | "series">("block");
  const [mobile, setMobile] = useState(false);
  const [editingCanvas, setEditingCanvas] = useState(true);
  const [spotlight, setSpotlight] = useState(true);
  const [focusRequest, setFocusRequest] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [undo, setUndo] = useState<Theme | null>(null);
  const [confirmation, setConfirmation] = useState<"restore" | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const properties = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLElement>(null);
  const selected = workspace.draft.blocks.find((block) => block.id === selectedId) ?? workspace.draft.blocks[0];
  const dirty = JSON.stringify(workspace.draft) !== JSON.stringify(workspace.applied);
  const errors = themeErrors(workspace.draft);

  useEffect(() => {
    if (confirmation && !dialog.current?.open) dialog.current?.showModal();
    else if (!confirmation && dialog.current?.open) dialog.current.close();
  }, [confirmation]);
  const selectFromCanvas = useCallback((id: string) => {
    setSelectedId(id);
    setSpotlight(true);
    setInspector("block");
    setFocusRequest((request) => request + 1);
    setMessage("Tuvalde seçtiğin bölümün ayarları açıldı. Değişiklikler burada anında görünür.");
    if (window.innerWidth <= 860) properties.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
  }, []);
  function selectFromList(id: string) {
    setSelectedId(id); setSpotlight(true); setInspector("block"); setEditingCanvas(true);
    setFocusRequest((request) => request + 1);
    if (window.innerWidth <= 1100) canvas.current?.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
    setMessage("Seçilen bölüm tuvalde aydınlatıldı. Ayarlarını özellikler panelinden değiştirebilirsin.");
  }
  function edit(theme: Theme) { save({ ...workspace, draft: theme }); setMessage(""); setUndo(null); }
  function useStarter(starter: Starter) {
    edit({ ...createTheme(starter), siteName: workspace.draft.siteName, accent: workspace.draft.accent });
    setSelectedId(null); setInspector("theme");
  }
  function confirm() {
    if (confirmation === "restore") {
      save(restoreApplied(workspace)); setUndo(null); setSelectedId(null);
      setMessage("Yalnızca taslak geri alındı. Ana sayfada uygulanan tema korunuyor.");
    }
    setConfirmation(null);
  }
  function apply() {
    if (errors.length || !ready) return;
    const persisted = save(applyDraft(workspace), true);
    setUndo(null);
    setMessage(persisted ? "Tema bu tarayıcıda uygulandı. Ana sayfada görebilirsin." : "Tema uygulanamadı; tarayıcı kaydı gerekli. Taslağın bu editörde duruyor.");
  }
  function removeSelected() {
    if (!selected) return;
    const previous = cloneTheme(workspace.draft);
    const next = removeBlock(workspace.draft, selected.id);
    save({ ...workspace, draft: next }); setUndo(previous);
    setSelectedId(null); setMessage(`${blockLabels[selected.kind]} taslaktan kaldırıldı. İstersen son kaldırmayı geri alabilirsin.`);
    if (!next.blocks.length) setPaletteOpen(true);
  }

  return <main className="studio">
    <header className="studio-topbar">
      <div className="studio-brand"><span className="studio-logo" aria-hidden="true">m<span>↗</span></span><div><strong>mrbyte<span> / </span>studio</strong><span className="studio-brand-note">KENDİ EVRENİNİ KUR.</span></div></div>
      <div className="studio-top-actions"><ThemeToggle /><Link className="studio-text-link" href="/" target="_blank">Uygulanan siteyi aç ↗</Link><Link className="studio-secondary" href="/preview" target="_blank">Taslağı tam ekran gör ↗</Link><button className="studio-primary" onClick={apply} disabled={!ready || !dirty || errors.length > 0}>Temayı uygula <span aria-hidden="true">↗</span></button></div>
    </header>
    <div className="studio-local-note"><span className="local-dot" /><strong>Yerel tasarım stüdyosu</strong><span>Taslak otomatik kaydedilir. “Uygula” bu tarayıcıdaki ana sayfayı değiştirir; sunucuda yayın yapmaz.</span></div>
    <div className="studio-workspace">

      <aside className="studio-sidebar" aria-label="Sayfa yapısını düzenle"><ThemeStructure theme={workspace.draft} ready={ready} selectedId={selected?.id} paletteOpen={paletteOpen} onPaletteChange={setPaletteOpen} onChooseStarter={useStarter} onChange={edit} onSelect={selectFromList} /></aside>
      <section className="studio-preview" aria-label="Canlı önizleme" ref={canvas}>
        <div className="canvas-toolbar"><div><span className="studio-eyebrow">02 / CANLI TUVAL</span><strong>{workspace.draft.name || "Adsız tema"} <span className="draft-badge">{dirty ? "Uygulanmamış taslak" : "Ana sayfayla aynı"}</span></strong></div><div className="device-switch" role="group" aria-label="Önizleme görünümü"><button aria-pressed={!mobile} onClick={() => setMobile(false)}>Gerçek boyut</button><button aria-pressed={mobile} onClick={() => setMobile(true)}>Mobil</button></div></div>
        <div className="canvas-modebar"><div className="device-switch" role="group" aria-label="Tuval etkileşimi"><button aria-pressed={editingCanvas} onClick={() => setEditingCanvas(true)}>Düzenle</button><button aria-pressed={!editingCanvas} onClick={() => setEditingCanvas(false)}>Gezin</button></div><p>{editingCanvas ? "Tuvalde bir bölüme tıkla; ilgili ayarları açılır." : "Menüleri ve bağlantıları ziyaretçi gibi dene."}</p>{selectedId && inspector === "block" && editingCanvas && spotlight && <button className="canvas-clear" onClick={() => setSpotlight(false)}>Tüm sayfayı aydınlat</button>}</div>
        <p role="status" className="studio-status canvas-feedback">{message || (!storageError && ready ? "Taslak otomatik olarak tarayıcıya kaydedilir." : "")}</p>
        <PreviewCanvas mobile={mobile} workspace={workspace} selection={{ id: inspector === "block" && spotlight ? selectedId : null, request: focusRequest, editing: editingCanvas }} onSelect={selectFromCanvas} />
        <div className="canvas-bottom"><span>{editingCanvas ? "SEÇİLİ BÖLÜM AYDINLIK KALIR." : "ZİYARETÇİ ÖNİZLEMESİ"}</span><span>Yazılar örnektir. İçerikler tema değişince korunur.</span></div>
      </section>
      <aside className={`studio-inspector ${selectedId && inspector === "block" ? "inspector-linked" : ""}`} aria-label="Düzenleme özellikleri" ref={properties}>
        <div className="inspector-switch" role="group" aria-label="Özellik türü"><button aria-pressed={inspector === "block"} onClick={() => setInspector("block")}>Blok ayarları</button><button aria-pressed={inspector === "theme"} onClick={() => setInspector("theme")}>Tema tasarımı</button><button aria-pressed={inspector === "series"} onClick={() => setInspector("series")}>Seriler</button></div>
        <fieldset disabled={!ready} className="inspector-fields"><div hidden={inspector !== "series"}><SeriesStudio /></div>{inspector === "series" ? null : inspector === "block" ? selected ? <><span className="studio-eyebrow">03 / {selectedId ? "TUVALLE BAĞLANTILI BLOK" : "BLOK ÖZELLİKLERİ"}</span><h2>{blockLabels[selected.kind]}</h2><p className="property-summary">{blockDescriptions[selected.kind]}</p><p className="placement-note">{blockPlacementNote(selected.kind)}</p><BlockProperties block={selected} onChange={(block) => edit(replaceBlock(workspace.draft, block))} onManageSeries={() => setInspector("series")} /><button className="studio-remove" onClick={removeSelected}>Bloğu kaldır −</button></> : <div className="inspector-empty"><span aria-hidden="true">＋</span><h2>Yeni bir bölüm ekle.</h2><p>Son bloğu da kaldırdın. “Blok ekle” ile yeniden başlayabilirsin; ana sayfadaki teman korunuyor.</p><button className="studio-secondary" onClick={() => setPaletteOpen(true)}>Blok paletini aç</button></div> : <><span className="studio-eyebrow">03 / GÖRSEL KİMLİK</span><h2>Başka bir site hissi.</h2><p className="property-summary">Yalnızca renk değil: yazı karakteri, atmosfer, genişlik ve ritim.</p><ThemeSettings theme={workspace.draft} onChange={edit} /></>}</fieldset>
        <div className="studio-save-state"><span className="studio-eyebrow">TASLAK & ANA SAYFA</span><p>{!ready ? "Kayıt yükleniyor…" : dirty ? "Şu an taslağı düzenliyorsun. Ana sayfa henüz değişmedi." : "Taslak, bu tarayıcıdaki ana sayfayla aynı."}</p><button disabled={!ready || !dirty} onClick={() => setConfirmation("restore")}>Taslağı uygulanan temaya döndür ↶</button>{undo && <button className="undo-removal" onClick={() => { save({ ...workspace, draft: undo }); setUndo(null); setMessage("Son kaldırılan blok geri geldi."); }}>Son kaldırmayı geri al ↶</button>}{storageError && <p role="alert" className="studio-error">{storageError}</p>}{errors.length > 0 && <ul className="studio-error">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>
      </aside>
    </div>
    <dialog className="studio-confirm" ref={dialog} aria-labelledby="confirm-title" onCancel={() => setConfirmation(null)}><div><span className="studio-eyebrow">MEVCUT TASLAK DEĞİŞECEK</span><h2 id="confirm-title">Taslağı geri al?</h2><p>Mevcut taslak düzenin ve ayarların, ana sayfada uygulanan temayla değiştirilecek. İçeriklerin ve ana sayfa değişmez; bunun için ayrıca “Temayı uygula” gerekir.</p><div className="confirm-actions"><button className="studio-secondary" onClick={() => setConfirmation(null)}>Vazgeç</button><button className="studio-primary" onClick={confirm}>Taslağı değiştir</button></div></div></dialog>
  </main>;
}
