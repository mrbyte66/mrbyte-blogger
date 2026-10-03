"use client";
import { useEffect, useRef } from "react";
import type { Theme } from "../../lib/builder/model";
import type { CanvasSelection } from "../../lib/builder/preview-protocol";
import { navigateEvent, targetFromLink, type DocumentDraft } from "../../lib/builder/document-protocol";
import { scrollBehavior } from "../../lib/motion";
import { ArticlePageView } from "./ArticlePage";
import { SeriesPageView } from "../series/SeriesPage";
export function DocumentPreview({ draft, theme, selection, onSelect }: { draft: DocumentDraft; theme: Theme; selection: CanvasSelection; onSelect: (field: string) => void }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    root.current?.querySelectorAll("[data-edit-field]").forEach((node) => node.classList.toggle("document-selected", node.getAttribute("data-edit-field") === selection.id));
    root.current?.classList.toggle("document-focus", selection.editing && selection.id !== "body" && !!root.current?.querySelector(".document-selected"));
  }, [selection.id, selection.editing, draft]);
  useEffect(() => {
    if (selection.editing && selection.id) root.current?.querySelector(`[data-edit-field="${CSS.escape(selection.id)}"]`)?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, [selection.id, selection.request, selection.editing]);
  return <div ref={root} className={selection.editing ? "document-editing" : ""} onClickCapture={(event) => {
    const node = event.target as HTMLElement;
    const link = node.closest("a");
    const destination = link && targetFromLink(link.getAttribute("href") ?? "");
    if (destination) { event.preventDefault(); event.stopPropagation(); window.parent.postMessage({ type: navigateEvent, target: destination }, window.location.origin); return; }
    if (!selection.editing) return;
    const field = node.closest("[data-edit-field]")?.getAttribute("data-edit-field");
    if (field) { event.preventDefault(); event.stopPropagation(); onSelect(field); }
  }}>
    {draft.kind === "article" ? <ArticlePageView article={draft.article} theme={theme} preview /> : <SeriesPageView slug={draft.series.slug} theme={theme} series={[draft.series]} preview />}
  </div>;
}
