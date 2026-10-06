"use client";
import { api } from "../api/http";
import type { ReadingMark, TextAnchor } from "./model";

/**
 * Member reading marks on the server (API contract §5). The page marks the abstract as "excerpt"
 * and paragraphs by their stable block ID; the API calls the abstract "abstract". Older guest notes
 * used "paragraph-N", which is translated with the article's block IDs when they are imported.
 */
export type ServerArticle = { id: string; revisionId: string; blockIds?: { paragraphs: string[] } };
type FragmentDto = { blockId: string; start: number; end: number; quote: string; before: string; after: string };
type AnnotationDto = { id: string; kind: ReadingMark["kind"]; revisionId: string; fragments: FragmentDto[]; note: string; createdAt: string; version: number };
type ListDto = { articleId: string; available?: boolean; revisionId?: string; items: (AnnotationDto | { id: string; available: false })[] };

export function toServerAnchor(anchorId: string, article: ServerArticle): string | null {
  if (anchorId === "excerpt") return "abstract";
  const legacy = /^paragraph-(\d+)$/.exec(anchorId);
  if (legacy) return article.blockIds?.paragraphs[Number(legacy[1])] ?? null;
  return anchorId;
}
const fromServerAnchor = (blockId: string) => blockId === "abstract" ? "excerpt" : blockId;

function fragmentsFor(mark: Pick<ReadingMark, "fragments">, article: ServerArticle): FragmentDto[] | null {
  const fragments: FragmentDto[] = [];
  for (const fragment of mark.fragments) {
    const blockId = toServerAnchor(fragment.anchorId, article);
    if (!blockId) return null;
    fragments.push({ blockId, start: fragment.start, end: fragment.end, quote: fragment.quote, before: fragment.before, after: fragment.after });
  }
  return fragments;
}

export async function loadServerMarks(article: ServerArticle): Promise<ReadingMark[]> {
  const { data } = await api<ListDto>("GET", `/me/articles/${article.id}/annotations`);
  return data.items.filter((item): item is AnnotationDto => "kind" in item).map((item) => ({
    id: item.id, kind: item.kind, note: item.note, createdAt: item.createdAt,
    fragments: item.fragments.map((f): TextAnchor => ({ anchorId: fromServerAnchor(f.blockId), start: f.start, end: f.end, quote: f.quote, before: f.before, after: f.after })),
  }));
}

/** Creates a mark under its client ID; undoing a removal re-creates the same ID. */
export async function createServerMark(article: ServerArticle, mark: ReadingMark): Promise<void> {
  const fragments = fragmentsFor(mark, article);
  if (!fragments) throw new Error("anchor");
  await api("PUT", `/me/articles/${article.id}/annotations/${mark.id}`, { body: { kind: mark.kind, revisionId: article.revisionId, fragments, note: mark.note }, ifNoneMatch: "*" });
}

export async function deleteServerMark(article: ServerArticle, markId: string): Promise<void> {
  await api("DELETE", `/me/articles/${article.id}/annotations/${markId}`);
}

/** Imports browser-only guest marks into the account; returns the IDs of accepted local marks. */
export async function importGuestMarks(article: ServerArticle, marks: ReadingMark[], clientImportId: string): Promise<{ accepted: string[]; rejected: number }> {
  const candidates = marks.map((mark) => ({ mark, fragments: fragmentsFor(mark, article) }));
  const items = candidates.filter((c) => c.fragments).map(({ mark, fragments }) => ({ articleId: article.id, revisionId: article.revisionId, kind: mark.kind, fragments, note: mark.note, createdAt: mark.createdAt }));
  const sent = candidates.filter((c) => c.fragments).map((c) => c.mark.id);
  if (!items.length) return { accepted: [], rejected: marks.length };
  const { data } = await api<{ accepted: { index: number }[]; rejected: { index: number }[] }>("POST", "/me/imports/annotations", { body: { clientImportId, items } });
  return { accepted: data.accepted.map((a) => sent[a.index]), rejected: data.rejected.length + (marks.length - items.length) };
}
