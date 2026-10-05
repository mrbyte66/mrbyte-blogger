"use client";
import type { SceneField } from "../../lib/builder/preview-protocol";

import { scrollBehavior } from "../../lib/motion";

import Link from "next/link";
import { StudioHeader } from "./StudioHeader";
import type { ReactNode } from "react";
import type { StudioTarget } from "../../lib/builder/document-protocol";
import { useSeriesWorkspace } from "../../lib/series/use-series-workspace";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyDraft, blockDescriptions, blockLabels, blockPlacementNote,
  cloneTheme, createTheme, removeBlock,
  replaceBlock, restoreApplied, themeErrors, type Starter, type Theme,
} from "../../lib/builder/model";
import { useWorkspace } from "../../lib/builder/use-workspace";
import { BlockProperties } from "./BlockProperties";
import { CanvasToolbar } from "./CanvasToolbar";
import { PreviewCanvas } from "./PreviewCanvas";
import { ThemeSettings } from "./ThemeSettings";
import { ThemeStructure } from "./ThemeStructure";


export function ThemeEditor({ onNavigate, navigation }: { navigation?: ReactNode; onNavigate?: (target: StudioTarget) => void }) {
  const { series } = useSeriesWorkspace();
  const { workspace, save, ready, storageError } = useWorkspace();
  const [sceneField, setSceneField] = useState<SceneField | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inspector, setInspector] = useState<"block" | "theme">("block");
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
  const selectFromCanvas = useCallback((id: string, field?: SceneField) => {
    setSceneField(field);
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
  async function apply() {
    if (errors.length || !ready) return;
    setMessage("Tema uygulanıyor…");
    const persisted = await save(applyDraft(workspace), true);
    setUndo(null);
    setMessage(persisted ? "Tema uygulandı. Ziyaretçiler ana sayfada yeni temayı görür." : "Tema uygulanamadı. Taslağın korunuyor; ayrıntı aşağıda.");
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
    <StudioHeader navigation={navigation} status={<span className="studio-state" title="Taslak otomatik kaydedilir; Uygula ziyaretçilerin gördüğü ana sayfayı değiştirir.">{dirty ? "Tema taslağı" : "Uygulandı"}</span>} actions={<><Link className="studio-text-link" href="/" target="_blank" aria-label="Siteyi aç ↗" title="Siteyi aç">↗</Link><Link className="studio-secondary" href="/preview" target="_blank" aria-label="Taslağı tam ekran gör ↗" title="Taslağı tam ekran gör">⛶</Link><button className="studio-primary" onClick={apply} disabled={!ready || !dirty || errors.length > 0}>Temayı uygula <span aria-hidden="true">↗</span></button></>} />

    <div className="studio-workspace">

      <aside className="studio-sidebar" aria-label="Sayfa yapısını düzenle"><ThemeStructure theme={workspace.draft} ready={ready} selectedId={selected?.id} paletteOpen={paletteOpen} onPaletteChange={setPaletteOpen} onChooseStarter={useStarter} onChange={edit} onSelect={selectFromList} /></aside>
      <section className="studio-preview" aria-label="Canlı önizleme" ref={canvas}>
        <CanvasToolbar title={<>{workspace.draft.name || "Adsız tema"} <span className="draft-badge">{dirty ? "Taslak" : "Uygulandı"}</span></>} mobile={mobile} editing={editingCanvas} onMobile={setMobile} onEditing={setEditingCanvas}>{selectedId && inspector === "block" && editingCanvas && spotlight && <button className="canvas-clear" onClick={() => setSpotlight(false)}>Seçimi gizle</button>}</CanvasToolbar>
        <p role="status" className="studio-status canvas-feedback">{message}</p>
        <PreviewCanvas mobile={mobile} workspace={workspace} selection={{ id: inspector === "block" && spotlight ? selectedId : null, request: focusRequest, editing: editingCanvas }} onSelect={selectFromCanvas} onNavigate={onNavigate} />
        <div className="canvas-bottom"><span>{editingCanvas ? "SEÇİLİ BÖLÜM AYDINLIK KALIR." : "ZİYARETÇİ ÖNİZLEMESİ"}</span><span>İçerikler tema değişince korunur.</span></div>
      </section>
      <aside className={`studio-inspector ${selectedId && inspector === "block" ? "inspector-linked" : ""}`} aria-label="Düzenleme özellikleri" ref={properties}>
        <div className="inspector-switch" role="group" aria-label="Özellik türü"><button aria-pressed={inspector === "block"} onClick={() => setInspector("block")}>Blok ayarları</button><button aria-pressed={inspector === "theme"} onClick={() => setInspector("theme")}>Tema tasarımı</button></div>
        <fieldset disabled={!ready} className="inspector-fields">{inspector === "block" ? selected ? <><span className="studio-eyebrow">{selectedId ? "SEÇİLİ BLOK" : "BLOK ÖZELLİKLERİ"}</span><h2>{blockLabels[selected.kind]}</h2><p className="property-summary">{blockDescriptions[selected.kind]}</p><p className="placement-note">{blockPlacementNote(selected.kind)}</p><BlockProperties block={selected} activeSceneField={sceneField} focusRequest={focusRequest} onChange={(block) => edit(replaceBlock(workspace.draft, block))} onManageSeries={() => { if (series[0]) onNavigate?.({ kind: "series", slug: series[0].slug }); }} /><button className="studio-remove" onClick={removeSelected}>Bloğu kaldır −</button></> : <div className="inspector-empty"><span aria-hidden="true">＋</span><h2>Yeni bir bölüm ekle.</h2><p>Son bloğu da kaldırdın. “Blok ekle” ile yeniden başlayabilirsin; ana sayfadaki teman korunuyor.</p><button className="studio-secondary" onClick={() => setPaletteOpen(true)}>Blok paletini aç</button></div> : <><span className="studio-eyebrow">TEMA</span><h2>Görsel kimlik</h2><p className="property-summary">Yalnızca renk değil: yazı karakteri, atmosfer, genişlik ve ritim.</p><ThemeSettings theme={workspace.draft} onChange={edit} /></>}</fieldset>
        <div className="studio-save-state"><span className="studio-eyebrow">TASLAK & ANA SAYFA</span><p>{!ready ? "Kayıt yükleniyor…" : dirty ? "Şu an taslağı düzenliyorsun; taslak otomatik kaydedilir. Ana sayfa henüz değişmedi." : "Taslak, yayındaki ana sayfayla aynı."}</p><button disabled={!ready || !dirty} onClick={() => setConfirmation("restore")}>Taslağı uygulanan temaya döndür ↶</button>{undo && <button className="undo-removal" onClick={() => { save({ ...workspace, draft: undo }); setUndo(null); setMessage("Son kaldırılan blok geri geldi."); }}>Son kaldırmayı geri al ↶</button>}{storageError && <p role="alert" className="studio-error">{storageError}</p>}{errors.length > 0 && <ul className="studio-error">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}</div>
      </aside>
    </div>
    <dialog className="studio-confirm" ref={dialog} aria-labelledby="confirm-title" onCancel={() => setConfirmation(null)}><div><span className="studio-eyebrow">MEVCUT TASLAK DEĞİŞECEK</span><h2 id="confirm-title">Taslağı geri al?</h2><p>Mevcut taslak düzenin ve ayarların, ana sayfada uygulanan temayla değiştirilecek. İçeriklerin ve ana sayfa değişmez; bunun için ayrıca “Temayı uygula” gerekir.</p><div className="confirm-actions"><button className="studio-secondary" onClick={() => setConfirmation(null)}>Vazgeç</button><button className="studio-primary" onClick={confirm}>Taslağı değiştir</button></div></div></dialog>
  </main>;
}
