import { parseReadingDocument, type ReadingDocument } from "./model";

export function readingStorageKey(articleId: string): string {
  return `mrbyte:reading:v1:${encodeURIComponent(articleId)}`;
}
export function readReadingDocument(articleId: string): { document: ReadingDocument; error: string | null } {
  const empty: ReadingDocument = { version: 1, articleId, marks: [] };
  try {
    const raw = localStorage.getItem(readingStorageKey(articleId));
    if (!raw) return { document: empty, error: null };
    const document = parseReadingDocument(raw, articleId);
    return document ? { document, error: null } : { document: empty, error: "Kayıtlı okuma notları okunamadı. Eski kayıt korunuyor; yeni not kaydedersen yerini alır." };
  } catch {
    return { document: empty, error: "Tarayıcı kaydına erişilemiyor. Yeni işaretler yalnızca bu sayfa açıkken tutulacak." };
  }
}
export function writeReadingDocument(document: ReadingDocument): boolean {
  try { localStorage.setItem(readingStorageKey(document.articleId), JSON.stringify(document)); return true; }
  catch { return false; }
}
