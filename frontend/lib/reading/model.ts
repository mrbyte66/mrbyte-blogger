export type ReadingMarkKind = "highlight" | "underline" | "note";
export type TextAnchor = {
  anchorId: string;
  start: number;
  end: number;
  quote: string;
  before: string;
  after: string;
};
export type ReadingMark = {
  id: string;
  kind: ReadingMarkKind;
  fragments: TextAnchor[];
  note: string;
  createdAt: string;
};
export type ReadingDocument = { version: 1; articleId: string; marks: ReadingMark[] };
export const maxMarks = 200;
export const maxNoteLength = 4000;
const maxQuoteLength = 12_000;
const contextLength = 48;
const safeId = /^[a-zA-Z0-9_-]{1,128}$/;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.length <= max;
}
function validFragment(value: unknown): value is TextAnchor {
  if (!record(value) || typeof value.anchorId !== "string" || !safeId.test(value.anchorId)) return false;
  return Number.isSafeInteger(value.start) && Number.isSafeInteger(value.end)
    && typeof value.start === "number" && typeof value.end === "number"
    && value.start >= 0 && value.end > value.start && value.end <= 1_000_000
    && boundedText(value.quote, maxQuoteLength) && value.quote.length === value.end - value.start
    && boundedText(value.before, contextLength) && boundedText(value.after, contextLength);
}
function validMark(value: unknown): value is ReadingMark {
  if (!record(value) || typeof value.id !== "string" || !safeId.test(value.id)) return false;
  return typeof value.kind === "string" && ["highlight", "underline", "note"].includes(value.kind)
    && Array.isArray(value.fragments) && value.fragments.length > 0 && value.fragments.length <= 30
    && value.fragments.every(validFragment)
    && value.fragments.reduce((sum, fragment) => sum + fragment.quote.length, 0) <= maxQuoteLength
    && boundedText(value.note, maxNoteLength) && (value.kind !== "note" || value.note.trim().length > 0)
    && typeof value.createdAt === "string" && value.createdAt.length <= 32 && Number.isFinite(Date.parse(value.createdAt));
}

export function parseReadingDocument(raw: string, articleId: string): ReadingDocument | null {
  if (raw.length > 2_000_000) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!record(value) || value.version !== 1 || value.articleId !== articleId
      || !Array.isArray(value.marks) || value.marks.length > maxMarks || !value.marks.every(validMark)
      || new Set(value.marks.map((mark) => mark.id)).size !== value.marks.length) return null;
    return { version: 1, articleId, marks: value.marks };
  } catch { return null; }
}

export function selectionAnchors(root: HTMLElement, selection: Selection | null): TextAnchor[] {
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) return [];
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return [];
  const fragments: TextAnchor[] = [];
  for (const element of root.querySelectorAll<HTMLElement>("[data-reading-anchor]")) {
    const anchorId = element.dataset.readingAnchor ?? "";
    if (!safeId.test(anchorId) || !range.intersectsNode(element)) continue;
    const text = element.textContent ?? "";
    if (!text.length) continue;
    let start = 0;
    let end = text.length;
    if (element.contains(range.startContainer)) {
      const before = document.createRange();
      before.selectNodeContents(element);
      before.setEnd(range.startContainer, range.startOffset);
      start = before.toString().length;
    }
    if (element.contains(range.endContainer)) {
      const before = document.createRange();
      before.selectNodeContents(element);
      before.setEnd(range.endContainer, range.endOffset);
      end = before.toString().length;
    }
    if (end <= start || !text.slice(start, end).trim()) continue;
    fragments.push({ anchorId, start, end, quote: text.slice(start, end), before: text.slice(Math.max(0, start - contextLength), start), after: text.slice(end, end + contextLength) });
  }
  if (fragments.length > 30 || fragments.reduce((sum, fragment) => sum + fragment.quote.length, 0) > maxQuoteLength) return [];
  return fragments;
}

// Context is a recovery hint when edits shift the original offsets. Ambiguous matches stay unresolved.
export function resolveOffsets(text: string, anchor: TextAnchor): { start: number; end: number } | null {
  if (text.slice(anchor.start, anchor.end) === anchor.quote) return { start: anchor.start, end: anchor.end };
  const matches: number[] = [];
  let from = 0;
  while (from <= text.length) {
    const index = text.indexOf(anchor.quote, from);
    if (index === -1) break;
    matches.push(index);
    from = index + 1;
  }
  const contextual = matches.filter((start) => text.slice(Math.max(0, start - anchor.before.length), start) === anchor.before && text.slice(start + anchor.quote.length, start + anchor.quote.length + anchor.after.length) === anchor.after);
  const candidates = contextual.length ? contextual : matches;
  return candidates.length === 1 ? { start: candidates[0], end: candidates[0] + anchor.quote.length } : null;
}

export function findAnchor(root: HTMLElement, anchorId: string): HTMLElement | null {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-reading-anchor]")).find((element) => element.dataset.readingAnchor === anchorId) ?? null;
}

function textPosition(element: HTMLElement, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  let remaining = offset;
  while (node) {
    if (remaining <= (node.textContent?.length ?? 0)) return { node: node as Text, offset: remaining };
    remaining -= node.textContent?.length ?? 0;
    node = walker.nextNode();
  }
  return null;
}

export function anchorRange(root: HTMLElement, anchor: TextAnchor): Range | null {
  const element = findAnchor(root, anchor.anchorId);
  if (!element) return null;
  const offsets = resolveOffsets(element.textContent ?? "", anchor);
  if (!offsets) return null;
  const start = textPosition(element, offsets.start);
  const end = textPosition(element, offsets.end);
  if (!start || !end) return null;
  const range = document.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  return range;
}
