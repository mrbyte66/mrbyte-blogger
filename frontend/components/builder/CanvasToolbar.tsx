import type { ReactNode } from "react";

export function CanvasToolbar({ title, mobile, editing, onMobile, onEditing, children }: {
  title: ReactNode; mobile: boolean; editing: boolean;
  onMobile: (mobile: boolean) => void; onEditing: (editing: boolean) => void; children?: ReactNode;
}) {
  return <div className="studio-canvas-tools">
    <div className="canvas-heading"><span className="studio-eyebrow">CANLI TUVAL</span><strong>{title}</strong></div>
    <div className="canvas-controls">
      <div className="device-switch" role="group" aria-label="Tuval etkileşimi"><button aria-pressed={editing} onClick={() => onEditing(true)}>Düzenle</button><button aria-pressed={!editing} onClick={() => onEditing(false)}>Gezin</button></div>
      <div className="device-switch" role="group" aria-label="Önizleme görünümü"><button aria-pressed={!mobile} onClick={() => onMobile(false)}>Gerçek boyut</button><button aria-pressed={mobile} onClick={() => onMobile(true)}>Mobil</button></div>
      {children}
    </div>
  </div>;
}
