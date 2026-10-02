import { addBlock, blockDescriptions, blockKinds, blockLabels, canMoveBlock, inferStarter, moveBlock, type Starter, type Theme } from "../../lib/builder/model";

const symbols = { header: "≡", intro: "Aa", scene: "[ ]", articles: "▤", quote: "“", about: "◎", projects: "⌘", footer: "↳" };
export const starters: { id: Starter; label: string; detail: string }[] = [
  { id: "scene", label: "Karakterli evren", detail: "Tek ekran · etkileşimli sahne" },
  { id: "feed", label: "Açık defter", detail: "Kaydırılan sayfa · yazı akışı" },
  { id: "magazine", label: "Dergi", detail: "Editoryal tipografi · kartlar" },
];


type Props = {
  theme: Theme;
  ready: boolean;
  selectedId?: string;
  paletteOpen: boolean;
  onPaletteChange: (open: boolean) => void;
  onChooseStarter: (starter: Starter) => void;
  onChange: (theme: Theme) => void;
  onSelect: (id: string) => void;
};

export function ThemeStructure({ theme, ready, selectedId, paletteOpen, onPaletteChange, onChooseStarter, onChange, onSelect }: Props) {
  const selectedStarter = inferStarter(theme);
  return (
      <section className="studio-structure" aria-label="Tema yapısı">
        <section aria-labelledby="starter-heading">
          <div className="studio-section-title"><h2 id="starter-heading">Başlangıç düzenleri</h2></div>
          <div className="starter-options">{starters.map((starter) => <button key={starter.id} className="starter-card" aria-label={`${starter.label} başlangıç düzeni`} aria-pressed={selectedStarter === starter.id} disabled={!ready} onClick={() => onChooseStarter(starter.id)}><span className={`starter-visual starter-${starter.id}`} aria-hidden="true">{starter.id === "scene" ? <><i /><b>[ ]</b><i /></> : <><b>{starter.id === "magazine" ? "Aa." : "Aa"}</b><i /><i /><i /></>}</span><span><strong>{starter.label}</strong><small>{starter.detail}</small>{selectedStarter === starter.id && <span className="starter-current">Bu yapı seçili ✓</span>}</span></button>)}</div>
        </section>
        <section aria-labelledby="structure-heading">
        <div className="studio-section-title"><h1 id="structure-heading">Sayfa yapısı</h1><span>{theme.blocks.length} blok</span></div>
        {!theme.blocks.length && <p className="property-note">Sayfan şu an boş. Blok ekleyerek yeni bir düzen oluşturabilirsin.</p>}
        <ol className="studio-block-list">{theme.blocks.map((block) => <li key={block.id} data-selected={block.id === selectedId} className={block.id === selectedId ? "is-selected" : ""}>
          <button disabled={!ready} className="block-select" aria-pressed={block.id === selectedId} onClick={() => onSelect(block.id)}><span className="block-symbol" aria-hidden="true">{symbols[block.kind]}</span><span>{blockLabels[block.kind]}<small>{block.kind === "header" ? "Başta sabit" : block.kind === "footer" ? "Sonda sabit" : ["intro", "scene"].includes(block.kind) ? "Giriş · sabit" : "İçerik bölümü"}</small></span></button>
          <div className="block-order"><button disabled={!ready || !canMoveBlock(theme, block.id, -1)} title={canMoveBlock(theme, block.id, -1) ? "Bir sıra yukarı" : "Bu konum yerleşim kuralıyla korunuyor"} aria-label={`${blockLabels[block.kind]} yukarı taşı`} onClick={() => { onChange(moveBlock(theme, block.id, -1)); onSelect(block.id); }}>↑</button><button disabled={!ready || !canMoveBlock(theme, block.id, 1)} title={canMoveBlock(theme, block.id, 1) ? "Bir sıra aşağı" : "Bu konum yerleşim kuralıyla korunuyor"} aria-label={`${blockLabels[block.kind]} aşağı taşı`} onClick={() => { onChange(moveBlock(theme, block.id, 1)); onSelect(block.id); }}>↓</button></div>
        </li>)}</ol>
        <button className="studio-add" disabled={!ready} aria-expanded={paletteOpen} aria-controls="block-palette" onClick={() => onPaletteChange(!paletteOpen)}><span aria-hidden="true">{paletteOpen ? "−" : "+"}</span> Blok ekle</button>
        {paletteOpen && <div id="block-palette" className="studio-palette">{blockKinds.map((kind) => {
          const exists = theme.blocks.some((block) => block.kind === kind);
          const otherLead = ["intro", "scene"].includes(kind) && theme.blocks.some((block) => ["intro", "scene"].includes(block.kind) && block.kind !== kind);
          const disabled = exists || otherLead;
          return <button key={kind} aria-label={`${blockLabels[kind]} ${disabled ? "mevcut" : "ekle"}`} disabled={disabled} onClick={() => { const id = crypto.randomUUID(); onChange(addBlock(theme, kind, id)); onSelect(id); }}><span aria-hidden="true">{symbols[kind]}</span><span><strong>{blockLabels[kind]}</strong><small>{exists ? "Sayfada mevcut" : otherLead ? "Önce mevcut giriş bloğunu kaldır" : blockDescriptions[kind]}</small></span><b aria-hidden="true">{disabled ? "✓" : "+"}</b></button>;
        })}</div>}
        <p className="studio-sidebar-foot">Üst menü başta, giriş başlangıçta, footer sonda kalır. İçerik bölümlerini kendi aralarında sırala.</p>
        </section>
      </section>
  );
}
