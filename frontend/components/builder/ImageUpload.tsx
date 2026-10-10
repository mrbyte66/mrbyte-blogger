"use client";
import { useId, useState, type ReactNode } from "react";
import { describe } from "../../lib/api/http";
import { useContentWorkspace } from "../../lib/editorial/use-content-workspace";

type UploadState = { kind: "idle" | "busy" | "done" | "error"; message: string };

/**
 * Owner image upload (JPEG/PNG, max 10 MiB). The server re-encodes the image and strips metadata.
 * `actions` sit beside the upload button (e.g. remove); the result message is shown right below them.
 */
export function ImageUpload({ label, onUploaded, actions }: { label: string; onUploaded: (url: string) => void; actions?: ReactNode }) {
  const { studio } = useContentWorkspace();
  const [state, setState] = useState<UploadState>({ kind: "idle", message: "" });
  const id = useId();
  if (!studio) return null;
  const busy = state.kind === "busy";
  return <div className="studio-upload">
    <div className="studio-upload-row">
      <label className="studio-secondary" htmlFor={id} aria-disabled={busy}>{busy ? "Yükleniyor…" : label}</label>
      {actions}
    </div>
    <input id={id} className="visually-hidden" type="file" accept="image/jpeg,image/png" disabled={busy} onChange={async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setState({ kind: "error", message: "Görsel en fazla 10 MiB olabilir." }); return; }
      setState({ kind: "busy", message: "Görsel yükleniyor…" });
      try { onUploaded(await studio.uploadImage(file)); setState({ kind: "done", message: "Görsel yüklendi." }); }
      catch (cause) { setState({ kind: "error", message: `Görsel yüklenemedi. ${describe(cause)}` }); }
    }} />
    <p role="status" className={`upload-status is-${state.kind}`}>{state.message}</p>
  </div>;
}
