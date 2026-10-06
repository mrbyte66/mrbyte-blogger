import { act, render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { AuthProvider } from "../components/auth/AuthProvider";
import { ReadingTools } from "../components/reading/ReadingTools";
import { readingStorageKey, readReadingDocument, writeReadingDocument } from "../lib/reading/storage";
import { sessionKey, sessionDuration } from "../lib/auth/model";
const documentData = { version: 1 as const, articleId: "sample", marks: [{ id: "mark-1", kind: "note" as const, note: "Alice private", createdAt: "2026-10-04T12:00:00.000Z", fragments: [{ anchorId: "paragraph-0", start: 0, end: 5, quote: "Hello", before: "", after: " world" }] }] };
beforeEach(() => localStorage.clear());
it("keeps guest annotations separate from member annotations", () => {
 writeReadingDocument(documentData);
 expect(readReadingDocument("sample", "alice").document.marks).toEqual([]);
 writeReadingDocument({ ...documentData, marks: [] }, "alice");
 expect(readReadingDocument("sample").document.marks).toHaveLength(1);
 expect(readingStorageKey("sample", "alice")).not.toBe(readingStorageKey("sample"));
});
