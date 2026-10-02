import { useEffect, useState } from "react";
import { accentColor, type Theme } from "../../lib/builder/model";

const colors = [
  { label: "Nane", value: "#c8efbc" }, { label: "Lavanta", value: "#d9c6f0" },
  { label: "Kehribar", value: "#efd19b" }, { label: "Mercan", value: "#ed9383" },
  { label: "Mavi", value: "#83b9e8" }, { label: "Grafit", value: "#475569" },
];
export function ThemeSettings({ theme, onChange }: { theme: Theme; onChange: (theme: Theme) => void }) {
  const color = accentColor(theme.accent);
  const [hex, setHex] = useState(color);
  useEffect(() => setHex(color), [color]);
  const validHex = /^#[a-fA-F0-9]{6}$/.test(hex);
  return <div className="theme-settings">
    <label className="studio-field"><span>Tema adı</span><input maxLength={80} value={theme.name} onChange={(event) => onChange({ ...theme, name: event.target.value })} /></label>
    <label className="studio-field"><span>Site adı</span><input maxLength={40} value={theme.siteName} onChange={(event) => onChange({ ...theme, siteName: event.target.value })} /></label>
    <div className="studio-field settings-full"><span>Vurgu rengi</span><p className="setting-explanation">Giriş işareti, alıntı zemini, yazı kartları ve sahnedeki yazı kısayolu değişir. Karakter görseli ve arkasındaki halka özgün tasarımını korur.</p>
      <div className="accent-options" role="group" aria-label="Hazır vurgu renkleri">{colors.map((item) => <button type="button" key={item.value} className="accent-choice" style={{ background: item.value }} aria-label={item.label} aria-pressed={color.toLowerCase() === item.value} onClick={() => onChange({ ...theme, accent: item.value })}><span aria-hidden="true">{color.toLowerCase() === item.value ? "✓" : ""}</span></button>)}</div>
      <div className="custom-color"><label><span>Kendi rengin</span><input type="color" aria-label="Özel vurgu rengi" value={color} onChange={(event) => onChange({ ...theme, accent: event.target.value })} /></label><label><span>HEX renk kodu</span><input aria-invalid={!validHex} maxLength={7} value={hex} onChange={(event) => { setHex(event.target.value); if (/^#[a-fA-F0-9]{6}$/.test(event.target.value)) onChange({ ...theme, accent: event.target.value }); }} /></label></div>
      {!validHex && <small role="status">Altı haneli bir renk kodu gir: örneğin #83b9e8. Son geçerli renk korunur.</small>}
    </div>
    <label className="studio-field"><span>Tipografi</span><select value={theme.typography} onChange={(event) => onChange({ ...theme, typography: event.target.value as Theme["typography"] })}><option value="modern">Modern · temiz ve yalın</option><option value="editorial">Editoryal · kitap / dergi</option><option value="mono">Terminal · teknik defter</option></select></label>
    <label className="studio-field"><span>Sayfa atmosferi</span><select value={theme.surface} onChange={(event) => onChange({ ...theme, surface: event.target.value as Theme["surface"] })}><option value="paper">Açık · kâğıt</option><option value="warm">Sıcak · arşiv</option><option value="night">Koyu · gece</option></select></label>
    <label className="studio-field"><span>İçerik genişliği</span><select value={theme.width} onChange={(event) => onChange({ ...theme, width: event.target.value as Theme["width"] })}><option value="reading">Odaklı okuma</option><option value="wide">Geniş vitrin</option></select></label>
    <label className="studio-field"><span>Bölüm aralıkları</span><select value={theme.spacing} onChange={(event) => onChange({ ...theme, spacing: event.target.value as Theme["spacing"] })}><option value="airy">Ferah</option><option value="compact">Kompakt</option></select></label>
    <p className="property-note settings-full">Tipografi ve atmosfer sayfanın kimliğini; genişlik ve aralıklar akış bölümlerini değiştirir. Karakter sahnesi ekranı dolduran özel düzenini korur. Bunların hepsi taslaktır; ana sayfa ancak “Temayı uygula” ile değişir.</p>
  </div>;
}
