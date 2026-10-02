"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** A short inert snapshot lets the old page move aside without running it twice. */
export function CoverTransition({ viewKey, backward, animate = true, children }: { viewKey: string; backward: boolean; animate?: boolean; children: ReactNode }) {
  const current = useRef<HTMLDivElement>(null);
  const old = useRef<HTMLDivElement>(null);
  const snapshot = useRef<{ html: string; scrollTop: number } | null>(null);
  const [frame, setFrame] = useState({ key: viewKey, previous: null as typeof snapshot.current, sequence: 0 });
  if (frame.key !== viewKey) setFrame({ key: viewKey, previous: animate ? snapshot.current : null, sequence: frame.sequence + 1 });
  useLayoutEffect(() => {
    if (!current.current) return;
    const clone = current.current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
    snapshot.current = { html: clone.innerHTML, scrollTop: current.current.querySelector(".panel-scroll")?.scrollTop ?? 0 };
  });
  useLayoutEffect(() => {
    const area = old.current?.querySelector(".panel-scroll");
    if (area && frame.previous) area.scrollTop = frame.previous.scrollTop;
    if (!frame.previous) return;
    const sequence = frame.sequence;
    const timer = setTimeout(() => setFrame((value) => value.sequence === sequence ? { ...value, previous: null } : value), 460);
    return () => clearTimeout(timer);
  }, [frame.previous, frame.sequence]);
  return <div className={`cover-frame ${frame.previous ? "cover-changing" : ""} ${backward ? "cover-back" : "cover-forward"}`}>
    {frame.previous && <div ref={old} className="cover-previous" aria-hidden="true" inert dangerouslySetInnerHTML={{ __html: frame.previous.html }} />}
    <div key={frame.sequence} ref={current} className="cover-current" onScrollCapture={() => { if (snapshot.current) snapshot.current.scrollTop = current.current?.querySelector(".panel-scroll")?.scrollTop ?? 0; }}>{children}</div>
  </div>;
}
