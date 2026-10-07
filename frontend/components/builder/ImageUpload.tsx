"use client";
import { useId, useState } from "react";
import { describe } from "../../lib/api/http";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";

/** Owner image upload (JPEG/PNG, max 10 MiB). The server re-encodes the image and strips metadata. */
export function ImageUpload({ label, onUploaded }: { label: string; onUploaded: (url: string) => void }) {
  const { studio } = useContentWorkspace();
  const [state, setState] = useState<{ busy: boolean; message: string }>({ busy: false, message: "" });
  const id = useId();
  if (!studio) return null;
  return <div className="studio-upload">
    <label className="studio-secondary" htmlFor={id} aria-disabled={state.busy}>{state.busy ? "Yükleniyor…" : label}</label>
    <input id={id} className="visually-hidden" type="file" accept="image/jpeg,image/png" disabled={state.busy} onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setState({ busy: false, message: "Görsel en fazla 10 MiB olabilir." }); return; }
      setState({ busy: true, message: "" });
      try { onUploaded(await studio.uploadImage(file)); setState({ busy: false, message: "Görsel yüklendi." }); }
      catch (cause) { setState({ busy: false, message: describe(cause) }); }
    }} />
    <span role="status" className="property-note">{state.message}</span>
  </div>;
}
