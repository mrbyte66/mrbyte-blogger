"use client";

import { useEffect, useRef, useState } from "react";
import type { Workspace } from "../../lib/builder/model";
import { isBlockId, previewEvents, type CanvasSelection } from "../../lib/builder/preview-protocol";

type Props = {
  mobile: boolean;
  workspace: Workspace;
  selection: CanvasSelection;
  onSelect: (id: string) => void;
};

export function PreviewCanvas({ mobile, workspace, selection, onSelect }: Props) {
  const frame = useRef<HTMLIFrameElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(600);
  const [loaded, setLoaded] = useState(false);
  const serialized = JSON.stringify(workspace);
  const current = useRef({ serialized, selection, workspace, onSelect });
  current.current = { serialized, selection, workspace, onSelect };

  function synchronize() {
    const target = frame.current?.contentWindow;
    const state = current.current;
    target?.postMessage({ type: previewEvents.workspace, workspace: state.serialized }, window.location.origin);
    target?.postMessage({ type: previewEvents.selection, ...state.selection }, window.location.origin);
  }

  useEffect(() => { synchronize(); }, [serialized]);
  useEffect(() => {
    frame.current?.contentWindow?.postMessage({ type: previewEvents.selection, ...selection }, window.location.origin);
  }, [selection.id, selection.request, selection.editing]);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === previewEvents.ready) { setLoaded(true); synchronize(); }
      if (event.data?.type === previewEvents.select && isBlockId(event.data.id) && current.current.workspace.draft.blocks.some((block) => block.id === event.data.id)) current.current.onSelect(event.data.id);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    if (!container.current) return;
    const observer = new ResizeObserver(([entry]) => setAvailableWidth(Math.max(1, entry.contentRect.width)));
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  const width = mobile ? 390 : Math.max(1, Math.round(availableWidth));
  const height = mobile ? 844 : 760;
  const scale = Math.min(1, availableWidth / width);
  return <div className="studio-canvas" ref={container}>
    <div className={`canvas-device ${mobile ? "device-mobile" : ""}`} style={{ width: width * scale, height: height * scale }}>
      {!loaded && <div className="canvas-loading" role="status">Tuval hazırlanıyor…</div>}
      <iframe ref={frame} onLoad={synchronize} title="Taslak tema canlı önizleme" src="/preview?embedded=1" style={{ width, height, transform: `scale(${scale})` }} />
    </div>
  </div>;
}
